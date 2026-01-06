/**
 * ProximityVoiceChat - WebRTC-based spatial voice and video chat
 *
 * Provides proximity-based voice and video communication between players.
 * Voice volume adjusts based on distance between characters in-game.
 * Video feeds render above player characters.
 */

import type { PeerId } from './NetworkProtocol.js';
import type { Position } from '../types.js';

// ============================================================================
// Types
// ============================================================================

export interface VoiceChatOptions {
  audio: boolean;
  video: boolean;
  videoWidth?: number;
  videoHeight?: number;
}

export interface SpatialAudioSettings {
  /** Distance at which attenuation begins (game units) */
  refDistance: number;
  /** Distance at which audio becomes silent (game units) */
  maxDistance: number;
  /** How quickly volume drops with distance */
  rolloffFactor: number;
  /** Panning model */
  panningModel: 'HRTF' | 'equalpower';
  /** Distance model */
  distanceModel: 'linear' | 'inverse' | 'exponential';
}

export interface PlayerVoiceState {
  peerId: PeerId;
  position: Position;
  displayName: string;
  audioStream: MediaStream | null;
  videoStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isTalking: boolean;
  volume: number; // 0-1
}

// ============================================================================
// WebRTC Signaling Messages
// ============================================================================

interface WebRTCOfferMessage {
  type: 'webrtc_offer';
  fromPeerId: PeerId;
  toPeerId: PeerId;
  sdp: string;
}

interface WebRTCAnswerMessage {
  type: 'webrtc_answer';
  fromPeerId: PeerId;
  toPeerId: PeerId;
  sdp: string;
}

interface WebRTCIceCandidateMessage {
  type: 'webrtc_ice_candidate';
  fromPeerId: PeerId;
  toPeerId: PeerId;
  candidate: RTCIceCandidateInit;
}

type WebRTCSignalingMessage =
  | WebRTCOfferMessage
  | WebRTCAnswerMessage
  | WebRTCIceCandidateMessage;

// ============================================================================
// ProximityVoiceChat
// ============================================================================

export class ProximityVoiceChat {
  private myPeerId: PeerId;
  private peerConnections: Map<PeerId, RTCPeerConnection> = new Map();
  private playerStates: Map<PeerId, PlayerVoiceState> = new Map();

  // Spatial audio
  private audioContext: AudioContext | null = null;
  private spatialNodes: Map<PeerId, PannerNode> = new Map();
  private audioSettings: SpatialAudioSettings;

  // Local media streams
  private localAudioStream: MediaStream | null = null;
  private localVideoStream: MediaStream | null = null;

  // Video elements for rendering
  private videoElements: Map<PeerId, HTMLVideoElement> = new Map();

  // Network messaging
  private sendSignalingMessage: (peerId: PeerId, message: any) => void;

  // ICE servers for NAT traversal
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // State
  private isLocalMuted: boolean = false;
  private isLocalVideoEnabled: boolean = true;

  constructor(
    myPeerId: PeerId,
    sendSignalingMessage: (peerId: PeerId, message: any) => void,
    audioSettings?: Partial<SpatialAudioSettings>
  ) {
    this.myPeerId = myPeerId;
    this.sendSignalingMessage = sendSignalingMessage;

    // Default spatial audio settings
    this.audioSettings = {
      refDistance: audioSettings?.refDistance ?? 10,
      maxDistance: audioSettings?.maxDistance ?? 100,
      rolloffFactor: audioSettings?.rolloffFactor ?? 2,
      panningModel: audioSettings?.panningModel ?? 'HRTF',
      distanceModel: audioSettings?.distanceModel ?? 'inverse',
    };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Start voice chat with a peer
   */
  async startChat(peerId: PeerId, options: VoiceChatOptions): Promise<void> {
    // Get local media streams
    if (!this.localAudioStream && options.audio) {
      this.localAudioStream = await this.getLocalAudioStream();
    }

    if (!this.localVideoStream && options.video) {
      this.localVideoStream = await this.getLocalVideoStream(
        options.videoWidth,
        options.videoHeight
      );
    }

    // Create peer connection
    const pc = this.createPeerConnection(peerId);

    // Add local tracks
    if (this.localAudioStream) {
      this.localAudioStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localAudioStream!);
      });
    }

    if (this.localVideoStream) {
      this.localVideoStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localVideoStream!);
      });
    }

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Send offer
    const offerMessage: WebRTCOfferMessage = {
      type: 'webrtc_offer',
      fromPeerId: this.myPeerId,
      toPeerId: peerId,
      sdp: offer.sdp!,
    };

    this.sendSignalingMessage(peerId, offerMessage);

    // Initialize player state
    this.playerStates.set(peerId, {
      peerId,
      position: { x: 0, y: 0 },
      displayName: peerId,
      audioStream: null,
      videoStream: null,
      isMuted: false,
      isVideoEnabled: false,
      isTalking: false,
      volume: 0,
    });
  }

  /**
   * Stop voice chat with a peer
   */
  stopChat(peerId: PeerId): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }

    // Clean up spatial audio
    const spatialNode = this.spatialNodes.get(peerId);
    if (spatialNode) {
      spatialNode.disconnect();
      this.spatialNodes.delete(peerId);
    }

    // Clean up video element
    const video = this.videoElements.get(peerId);
    if (video) {
      video.srcObject = null;
      this.videoElements.delete(peerId);
    }

    // Remove player state
    this.playerStates.delete(peerId);
  }

  /**
   * Stop all voice chats and cleanup
   */
  destroy(): void {
    // Close all peer connections
    for (const peerId of this.peerConnections.keys()) {
      this.stopChat(peerId);
    }

    // Stop local streams
    if (this.localAudioStream) {
      this.localAudioStream.getTracks().forEach(track => track.stop());
      this.localAudioStream = null;
    }

    if (this.localVideoStream) {
      this.localVideoStream.getTracks().forEach(track => track.stop());
      this.localVideoStream = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  // ============================================================================
  // Local Media Streams
  // ============================================================================

  /**
   * Get local audio stream
   */
  private async getLocalAudioStream(): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  }

  /**
   * Get local video stream
   */
  private async getLocalVideoStream(
    width: number = 320,
    height: number = 240
  ): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: 15, max: 30 },
      },
    });
  }

  // ============================================================================
  // WebRTC Peer Connection
  // ============================================================================

  /**
   * Create RTCPeerConnection
   */
  private createPeerConnection(peerId: PeerId): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
    });

    // Handle incoming tracks
    pc.ontrack = (event) => {
      this.handleRemoteTrack(peerId, event);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidateMessage: WebRTCIceCandidateMessage = {
          type: 'webrtc_ice_candidate',
          fromPeerId: this.myPeerId,
          toPeerId: peerId,
          candidate: event.candidate.toJSON(),
        };

        this.sendSignalingMessage(peerId, candidateMessage);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.warn(`[ProximityVoiceChat] Connection to ${peerId} ${pc.connectionState}`);
      }
    };

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  /**
   * Handle incoming remote track
   */
  private handleRemoteTrack(peerId: PeerId, event: RTCTrackEvent): void {
    const stream = event.streams[0];
    if (!stream) return;

    const playerState = this.playerStates.get(peerId);
    if (!playerState) return;

    if (event.track.kind === 'audio') {
      playerState.audioStream = stream;
      this.setupSpatialAudio(peerId, stream);
    } else if (event.track.kind === 'video') {
      playerState.videoStream = stream;
      playerState.isVideoEnabled = true;
    }
  }

  // ============================================================================
  // Spatial Audio
  // ============================================================================

  /**
   * Setup spatial audio for a peer's audio stream
   */
  private setupSpatialAudio(peerId: PeerId, stream: MediaStream): void {
    // Create audio context if needed
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    // Create source from stream
    const source = this.audioContext.createMediaStreamSource(stream);

    // Create panner node for 3D audio
    const panner = this.audioContext.createPanner();
    panner.panningModel = this.audioSettings.panningModel;
    panner.distanceModel = this.audioSettings.distanceModel;
    panner.refDistance = this.audioSettings.refDistance;
    panner.maxDistance = this.audioSettings.maxDistance;
    panner.rolloffFactor = this.audioSettings.rolloffFactor;

    // Connect: source -> panner -> destination
    source.connect(panner);
    panner.connect(this.audioContext.destination);

    this.spatialNodes.set(peerId, panner);
  }

  /**
   * Update spatial audio positions
   */
  update(myPosition: Position, playerPositions: Map<PeerId, Position>): void {
    if (!this.audioContext) return;

    // Update listener position (local player)
    const listener = this.audioContext.listener;
    if (listener.positionX) {
      listener.positionX.value = 0;
      listener.positionY.value = 0;
      listener.positionZ.value = 0;
    }

    // Update each player's spatial position
    for (const [peerId, position] of playerPositions) {
      const panner = this.spatialNodes.get(peerId);
      if (!panner) continue;

      // Calculate relative position
      const dx = position.x - myPosition.x;
      const dy = position.y - myPosition.y;

      // Set 3D position (Y is up in Web Audio API)
      if (panner.positionX) {
        panner.positionX.value = dx;
        panner.positionY.value = 0;
        panner.positionZ.value = -dy; // Negative because we're facing +Z
      }

      // Update player state
      const playerState = this.playerStates.get(peerId);
      if (playerState) {
        playerState.position = position;

        // Calculate volume based on distance
        const distance = Math.sqrt(dx * dx + dy * dy);
        playerState.volume = this.calculateVolume(distance);
      }
    }
  }

  /**
   * Calculate volume based on distance
   */
  private calculateVolume(distance: number): number {
    if (distance <= this.audioSettings.refDistance) {
      return 1.0;
    }

    if (distance >= this.audioSettings.maxDistance) {
      return 0.0;
    }

    // Inverse distance model
    const volume =
      this.audioSettings.refDistance /
      (this.audioSettings.refDistance +
        this.audioSettings.rolloffFactor * (distance - this.audioSettings.refDistance));

    return Math.max(0, Math.min(1, volume));
  }

  // ============================================================================
  // WebRTC Signaling
  // ============================================================================

  /**
   * Handle WebRTC signaling messages
   */
  async handleSignalingMessage(message: WebRTCSignalingMessage): Promise<void> {
    switch (message.type) {
      case 'webrtc_offer':
        await this.handleOffer(message);
        break;

      case 'webrtc_answer':
        await this.handleAnswer(message);
        break;

      case 'webrtc_ice_candidate':
        await this.handleIceCandidate(message);
        break;
    }
  }

  /**
   * Handle incoming offer
   */
  private async handleOffer(message: WebRTCOfferMessage): Promise<void> {
    const peerId = message.fromPeerId;

    // Create peer connection if doesn't exist
    let pc = this.peerConnections.get(peerId);
    if (!pc) {
      pc = this.createPeerConnection(peerId);

      // Add local tracks if available
      if (this.localAudioStream) {
        this.localAudioStream.getTracks().forEach(track => {
          pc!.addTrack(track, this.localAudioStream!);
        });
      }

      if (this.localVideoStream) {
        this.localVideoStream.getTracks().forEach(track => {
          pc!.addTrack(track, this.localVideoStream!);
        });
      }
    }

    // Set remote description
    await pc.setRemoteDescription({
      type: 'offer',
      sdp: message.sdp,
    });

    // Create answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Send answer
    const answerMessage: WebRTCAnswerMessage = {
      type: 'webrtc_answer',
      fromPeerId: this.myPeerId,
      toPeerId: peerId,
      sdp: answer.sdp!,
    };

    this.sendSignalingMessage(peerId, answerMessage);

    // Initialize player state if needed
    if (!this.playerStates.has(peerId)) {
      this.playerStates.set(peerId, {
        peerId,
        position: { x: 0, y: 0 },
        displayName: peerId,
        audioStream: null,
        videoStream: null,
        isMuted: false,
        isVideoEnabled: false,
        isTalking: false,
        volume: 0,
      });
    }
  }

  /**
   * Handle incoming answer
   */
  private async handleAnswer(message: WebRTCAnswerMessage): Promise<void> {
    const pc = this.peerConnections.get(message.fromPeerId);
    if (!pc) return;

    await pc.setRemoteDescription({
      type: 'answer',
      sdp: message.sdp,
    });
  }

  /**
   * Handle ICE candidate
   */
  private async handleIceCandidate(message: WebRTCIceCandidateMessage): Promise<void> {
    const pc = this.peerConnections.get(message.fromPeerId);
    if (!pc) return;

    await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
  }

  // ============================================================================
  // Video Rendering
  // ============================================================================

  /**
   * Render video feeds above characters
   */
  renderVideoFeeds(
    ctx: CanvasRenderingContext2D,
    playerPositions: Map<PeerId, { position: Position; displayName?: string }>
  ): void {
    for (const [peerId, playerInfo] of playerPositions) {
      const playerState = this.playerStates.get(peerId);
      if (!playerState || !playerState.videoStream || !playerState.isVideoEnabled) {
        continue;
      }

      // Get or create video element
      const video = this.getOrCreateVideoElement(peerId, playerState.videoStream);

      // Calculate screen position (video above character)
      const x = playerInfo.position.x;
      const y = playerInfo.position.y - 40; // Above head

      const width = 64;
      const height = 48;

      // Draw border
      ctx.save();

      // Glow effect if talking
      if (playerState.isTalking) {
        ctx.shadowColor = '#0f0';
        ctx.shadowBlur = 10;
      }

      ctx.strokeStyle = playerState.isTalking ? '#0f0' : '#4a9eff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - width / 2, y - height / 2, width, height);

      // Draw video
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        ctx.drawImage(video, x - width / 2, y - height / 2, width, height);
      }

      // Draw name label
      if (playerInfo.displayName) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - width / 2, y - height / 2 - 16, width, 14);

        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(playerInfo.displayName, x, y - height / 2 - 14);
      }

      // Draw volume indicator
      if (playerState.volume > 0) {
        const barWidth = width * playerState.volume;
        ctx.fillStyle = '#0f0';
        ctx.fillRect(x - width / 2, y + height / 2 + 2, barWidth, 4);
      }

      ctx.restore();
    }
  }

  /**
   * Get or create video element for peer
   */
  private getOrCreateVideoElement(
    peerId: PeerId,
    stream: MediaStream
  ): HTMLVideoElement {
    let video = this.videoElements.get(peerId);

    if (!video) {
      video = document.createElement('video');
      video.autoplay = true;
      video.muted = true; // Mute video element (audio comes through spatial audio)
      this.videoElements.set(peerId, video);
    }

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    return video;
  }

  // ============================================================================
  // Audio/Video Controls
  // ============================================================================

  /**
   * Mute/unmute local audio
   */
  setMuted(muted: boolean): void {
    this.isLocalMuted = muted;

    if (this.localAudioStream) {
      this.localAudioStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  /**
   * Enable/disable local video
   */
  setVideoEnabled(enabled: boolean): void {
    this.isLocalVideoEnabled = enabled;

    if (this.localVideoStream) {
      this.localVideoStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Check if local audio is muted
   */
  isMuted(): boolean {
    return this.isLocalMuted;
  }

  /**
   * Check if local video is enabled
   */
  isVideoEnabled(): boolean {
    return this.isLocalVideoEnabled;
  }

  /**
   * Get player voice states
   */
  getPlayerStates(): Map<PeerId, PlayerVoiceState> {
    return this.playerStates;
  }

  /**
   * Update player display name
   */
  setPlayerDisplayName(peerId: PeerId, displayName: string): void {
    const playerState = this.playerStates.get(peerId);
    if (playerState) {
      playerState.displayName = displayName;
    }
  }
}
