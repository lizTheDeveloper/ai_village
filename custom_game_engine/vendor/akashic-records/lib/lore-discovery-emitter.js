/**
 * LoreDiscoveryEmitter — Shared module for emitting lore discovery events
 * to the Akashic Records wiki. Include via <script> tag or import as ESM.
 *
 * Events are buffered and batch-POSTed every 30s or on page unload.
 * Already-discovered items are deduplicated via localStorage cache.
 * Offline discoveries sync when connectivity resumes.
 *
 * Event format: category:subject:aspect[:detail]
 * Categories: species, item, biome, event, civilization
 *
 * Usage:
 *   // Script tag (sets window.LoreDiscoveryEmitter)
 *   <script src="/akashic-records/lib/lore-discovery-emitter.js"></script>
 *   const emitter = new LoreDiscoveryEmitter({ game: 'precursors' });
 *   emitter.discover('species', 'norn', 'encountered');
 *
 *   // ESM import
 *   import { LoreDiscoveryEmitter } from './lore-discovery-emitter.js';
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    root.LoreDiscoveryEmitter = exports.LoreDiscoveryEmitter;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY = 'akashic_discoveries';
  const BATCH_INTERVAL_MS = 30000;
  const API_PATH = '/api/lore/discover';

  const VALID_CATEGORIES = new Set(['species', 'item', 'biome', 'event', 'civilization', 'character']);
  const VALID_ASPECTS = {
    species: new Set(['encountered', 'behavior', 'culture', 'folklore', 'art', 'language', 'songs', 'genetics', 'allied', 'emerged']),
    item: new Set(['found', 'used', 'crafted', 'lore']),
    biome: new Set(['entered', 'explored', 'deep_lore']),
    event: new Set(['witnessed', 'participated', 'emerged']),
    civilization: new Set(['discovered', 'ruins_found', 'texts_read', 'allied', 'emerged', 'identified']),
    character: new Set(['encountered', 'befriended', 'antagonized', 'allied', 'lore']),
  };

  /**
   * @param {Object} options
   * @param {string} options.game - Game identifier (precursors, mvee, cotb, nel)
   * @param {string} [options.apiBase] - API base URL (default: same origin)
   * @param {function} [options.getAuthToken] - Returns Matrix auth token
   * @param {function} [options.getUserId] - Returns Matrix user ID
   */
  function LoreDiscoveryEmitter(options) {
    if (!options || !options.game) {
      throw new Error('[LoreDiscoveryEmitter] options.game is required');
    }

    this._game = options.game;
    this._apiBase = options.apiBase || '';
    this._getAuthToken = options.getAuthToken || function () { return null; };
    this._getUserId = options.getUserId || function () { return null; };
    this._buffer = [];
    this._discovered = this._loadDiscoveries();
    this._intervalId = null;
    this._destroyed = false;
    this._listeners = {};

    this._start();
  }

  // --- Public API ---

  /**
   * Record a discovery event.
   * @param {string} category - species, item, biome, event, civilization, character
   * @param {string} subject - e.g. 'norn', 'golden_apple', 'crystal_cavern'
   * @param {string} aspect - e.g. 'encountered', 'found', 'entered'
   * @param {string|null} [detail] - Optional detail (e.g. count threshold, sub-aspect)
   * @returns {boolean} true if this is a new discovery, false if already known
   */
  LoreDiscoveryEmitter.prototype.discover = function (category, subject, aspect, detail) {
    if (this._destroyed) {
      throw new Error('[LoreDiscoveryEmitter] Cannot emit after destroy()');
    }

    if (!VALID_CATEGORIES.has(category)) {
      throw new Error('[LoreDiscoveryEmitter] Invalid category: ' + category + '. Valid: ' + Array.from(VALID_CATEGORIES).join(', '));
    }

    var validAspects = VALID_ASPECTS[category];
    if (validAspects && !validAspects.has(aspect)) {
      throw new Error('[LoreDiscoveryEmitter] Invalid aspect "' + aspect + '" for category "' + category + '". Valid: ' + Array.from(validAspects).join(', '));
    }

    var eventKey = this._makeKey(category, subject, aspect, detail);

    if (this._discovered.has(eventKey)) {
      return false;
    }

    this._discovered.add(eventKey);
    this._saveDiscoveries();

    var event = {
      event: 'lore:discover',
      game: this._game,
      category: category,
      subject: subject,
      aspect: aspect,
      detail: detail || null,
      timestamp: new Date().toISOString(),
    };

    this._buffer.push(event);
    this._emit('discovery', event);

    return true;
  };

  /**
   * Check if something has already been discovered.
   */
  LoreDiscoveryEmitter.prototype.hasDiscovered = function (category, subject, aspect, detail) {
    return this._discovered.has(this._makeKey(category, subject, aspect, detail));
  };

  /**
   * Get count of discoveries for a subject (useful for count thresholds like behavior:5).
   */
  LoreDiscoveryEmitter.prototype.getDiscoveryCount = function (category, subject) {
    var prefix = category + ':' + subject + ':';
    var count = 0;
    this._discovered.forEach(function (key) {
      if (key.indexOf(prefix) === 0) count++;
    });
    return count;
  };

  /**
   * Get all discoveries as an array of event keys.
   */
  LoreDiscoveryEmitter.prototype.getDiscoveries = function () {
    return Array.from(this._discovered);
  };

  /**
   * Subscribe to emitter events.
   * @param {string} eventName - 'discovery' | 'sync' | 'error'
   * @param {function} handler
   */
  LoreDiscoveryEmitter.prototype.on = function (eventName, handler) {
    if (!this._listeners[eventName]) {
      this._listeners[eventName] = [];
    }
    this._listeners[eventName].push(handler);
  };

  /**
   * Remove a listener.
   */
  LoreDiscoveryEmitter.prototype.off = function (eventName, handler) {
    var list = this._listeners[eventName];
    if (!list) return;
    var idx = list.indexOf(handler);
    if (idx !== -1) list.splice(idx, 1);
  };

  /**
   * Force an immediate flush of the buffer to the API.
   * @returns {Promise<void>}
   */
  LoreDiscoveryEmitter.prototype.flush = function () {
    return this._flush();
  };

  /**
   * Clean up: flush remaining events and stop the interval.
   */
  LoreDiscoveryEmitter.prototype.destroy = function () {
    if (this._destroyed) return;
    this._destroyed = true;

    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }

    this._removeUnloadListener();
    this._flush();
  };

  // --- Internal ---

  LoreDiscoveryEmitter.prototype._makeKey = function (category, subject, aspect, detail) {
    var key = category + ':' + subject + ':' + aspect;
    if (detail) key += ':' + detail;
    return key;
  };

  LoreDiscoveryEmitter.prototype._start = function () {
    var self = this;

    this._intervalId = setInterval(function () {
      self._flush();
    }, BATCH_INTERVAL_MS);

    this._boundUnload = function () {
      self._flushSync();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
          self._flushSync();
        }
      });
      window.addEventListener('pagehide', this._boundUnload);
    }

    if (typeof navigator !== 'undefined' && navigator.onLine !== undefined) {
      window.addEventListener('online', function () {
        self._flush();
      });
    }
  };

  LoreDiscoveryEmitter.prototype._removeUnloadListener = function () {
    if (typeof window !== 'undefined' && this._boundUnload) {
      window.removeEventListener('pagehide', this._boundUnload);
    }
  };

  LoreDiscoveryEmitter.prototype._flush = function () {
    if (this._buffer.length === 0) return Promise.resolve();

    var events = this._buffer.splice(0);
    var userId = this._getUserId();
    var token = this._getAuthToken();
    var url = this._apiBase + API_PATH;
    var self = this;

    var body = JSON.stringify({
      userId: userId,
      events: events,
    });

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
      },
      body: body,
    }).then(function (res) {
      if (!res.ok) {
        // Re-buffer on failure for retry
        self._buffer = events.concat(self._buffer);
        self._emit('error', { status: res.status, events: events });
      } else {
        self._emit('sync', { count: events.length });
      }
    }).catch(function (err) {
      // Re-buffer on network failure
      self._buffer = events.concat(self._buffer);
      self._emit('error', { error: err, events: events });
    });
  };

  LoreDiscoveryEmitter.prototype._flushSync = function () {
    if (this._buffer.length === 0) return;
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
      return;
    }

    var events = this._buffer.splice(0);
    var userId = this._getUserId();

    var body = JSON.stringify({
      userId: userId,
      events: events,
    });

    var sent = navigator.sendBeacon(this._apiBase + API_PATH, new Blob([body], { type: 'application/json' }));
    if (!sent) {
      // Re-buffer if sendBeacon failed
      this._buffer = events.concat(this._buffer);
    }
  };

  LoreDiscoveryEmitter.prototype._loadDiscoveries = function () {
    try {
      if (typeof localStorage === 'undefined') return new Set();
      var stored = localStorage.getItem(STORAGE_KEY + '_' + this._game);
      if (!stored) return new Set();
      return new Set(JSON.parse(stored));
    } catch (e) {
      return new Set();
    }
  };

  LoreDiscoveryEmitter.prototype._saveDiscoveries = function () {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(
        STORAGE_KEY + '_' + this._game,
        JSON.stringify(Array.from(this._discovered))
      );
    } catch (e) {
      // localStorage full or unavailable — discoveries still tracked in memory
    }
  };

  LoreDiscoveryEmitter.prototype._emit = function (eventName, data) {
    var list = this._listeners[eventName];
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      try {
        list[i](data);
      } catch (e) {
        console.error('[LoreDiscoveryEmitter] Handler error:', e);
      }
    }
  };

  return { LoreDiscoveryEmitter: LoreDiscoveryEmitter };
});
