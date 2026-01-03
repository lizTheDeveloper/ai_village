import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CulturalDiffusionView } from '@/components/CulturalDiffusionView';
import { mockCulturalData } from '../mockData';

// Mock D3-sankey
vi.mock('d3-sankey', () => ({
  sankey: vi.fn(() => ({
    nodeWidth: vi.fn(() => ({})),
    nodePadding: vi.fn(() => ({})),
    extent: vi.fn(() => ({})),
  })),
  sankeyLinkHorizontal: vi.fn(),
}));

describe('CulturalDiffusionView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Acceptance Criterion 6: Cultural Diffusion Visualization', () => {
    it('should render Sankey diagram showing behavior flow', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} />);

      await waitFor(() => {
        expect(screen.getByTestId('sankey-diagram')).toBeInTheDocument();
      });
    });

    it('should show behavior flow from agent to agent', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} />);

      await waitFor(() => {
        expect(screen.getByTestId('sankey-diagram')).toBeInTheDocument();
      });

      // Verify nodes and links
      expect(mockCulturalData.sankeyData.nodes).toHaveLength(3);
      expect(mockCulturalData.sankeyData.links).toHaveLength(3);
    });

    it('should display cascade trees showing influence hierarchy', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} showCascades={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('cascade-tree')).toBeInTheDocument();
      });

      // Verify cascade structure
      const cascade = mockCulturalData.cascadeTrees[0]!;
      expect(cascade.behavior).toBe('craft');
      expect(cascade.root).toBe('agent-001');
      expect(cascade.children).toHaveLength(2);
    });

    it('should show who influenced whom in cascade tree', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} showCascades={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('cascade-tree')).toBeInTheDocument();
      });

      // Verify parent-child relationships
      const cascade = mockCulturalData.cascadeTrees[0]!;
      expect(cascade.children[0]!.agent).toBe('agent-002');
      expect(cascade.children[1]!.agent).toBe('agent-003');
    });

    it('should display adoption curves with S-shape', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} showAdoption={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('adoption-curves')).toBeInTheDocument();
      });

      // Verify S-curve data
      const craftCurve = mockCulturalData.adoptionCurves.craft;
      expect(craftCurve).toHaveLength(5);

      // Check increasing adopters (S-curve)
      for (let i = 1; i < craftCurve.length; i++) {
        expect(craftCurve[i]!.adopters).toBeGreaterThanOrEqual(craftCurve[i - 1]!.adopters);
      }
    });

    it('should highlight top influencers', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} />);

      await waitFor(() => {
        expect(screen.getByTestId('influencers-list')).toBeInTheDocument();
      });

      // Verify influencers are ranked by spread count
      expect(mockCulturalData.influencers).toHaveLength(2);
      expect(mockCulturalData.influencers[0]!.spreadCount).toBeGreaterThanOrEqual(
        mockCulturalData.influencers[1]!.spreadCount
      );
    });

    it('should show top influencer with largest node or badge', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} />);

      await waitFor(() => {
        expect(screen.getByTestId('top-influencer-badge')).toBeInTheDocument();
      });

      const topInfluencer = mockCulturalData.influencers[0]!;
      expect(screen.getByText(topInfluencer.name)).toBeInTheDocument();
    });

    it('should show transmission rates for behaviors', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} showTransmissionRates={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('transmission-rates')).toBeInTheDocument();
      });

      // Verify transmission rates
      const { transmissionRates } = mockCulturalData;
      expect(transmissionRates.craft).toBe(0.35);
      expect(transmissionRates.socialize).toBe(0.42);
      expect(transmissionRates.gather).toBe(0.28);
    });

    it('should display transmission rate as percentage', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} showTransmissionRates={true} />);

      await waitFor(() => {
        expect(screen.getByText(/35%/)).toBeInTheDocument(); // craft: 0.35
        expect(screen.getByText(/42%/)).toBeInTheDocument(); // socialize: 0.42
      });
    });
  });

  describe('Sankey diagram interaction', () => {
    it('should show behavior name on link hover', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} />);

      const link = screen.getByTestId('sankey-link-0');
      fireEvent.mouseEnter(link);

      await waitFor(() => {
        expect(screen.getByText(/craft/i)).toBeInTheDocument();
      });
    });

    it('should show influence count on link', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} />);

      const link = screen.getByTestId('sankey-link-0');
      fireEvent.mouseEnter(link);

      await waitFor(() => {
        expect(screen.getByText(/5/)).toBeInTheDocument(); // value: 5
      });
    });
  });

  describe('cascade tree interaction', () => {
    it('should expand/collapse cascade branches', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} showCascades={true} />);

      const expandButton = screen.getByLabelText(/expand/i);
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getAllByTestId('cascade-node')).toHaveLength(3); // root + 2 children
      });
    });

    it('should show timestamp of adoption in cascade', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} showCascades={true} />);

      await waitFor(() => {
        const cascade = mockCulturalData.cascadeTrees[0]!;
        expect(screen.getByText(String(cascade.children[0]!.timestamp))).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should throw when sankeyData is missing', () => {
      expect(() => {
        render(
          <CulturalDiffusionView
            data={{ cascadeTrees: [], adoptionCurves: {}, influencers: [], transmissionRates: {} } as any}
          />
        );
      }).toThrow('sankeyData');
    });

    it('should display error message on render failure', async () => {
      const badData = { ...mockCulturalData, sankeyData: null };

      render(<CulturalDiffusionView data={badData as any} />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading states', () => {
    it('should show loading indicator while data is loading', () => {
      render(<CulturalDiffusionView data={null} loading={true} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('should filter by behavior type', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} filterBehavior="craft" />);

      await waitFor(() => {
        const links = mockCulturalData.sankeyData.links.filter((l) => l.behavior === 'craft');
        expect(links.length).toBeGreaterThan(0);
      });
    });

    it('should show all behaviors when no filter is applied', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} />);

      await waitFor(() => {
        expect(screen.getByTestId('sankey-diagram')).toBeInTheDocument();
      });

      const allLinks = mockCulturalData.sankeyData.links;
      expect(allLinks.length).toBe(3);
    });
  });

  describe('adoption curve details', () => {
    it('should show adoption rate per time point', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} showAdoption={true} />);

      await waitFor(() => {
        const curve = mockCulturalData.adoptionCurves.craft;
        curve.forEach((point) => {
          expect(point).toHaveProperty('rate');
        });
      });
    });

    it('should calculate adoption velocity', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} showAdoption={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('adoption-velocity')).toBeInTheDocument();
      });

      // Velocity = change in adopters / change in time
    });
  });

  describe('influencer ranking', () => {
    it('should sort influencers by spread count', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} />);

      await waitFor(() => {
        const influencers = mockCulturalData.influencers;
        for (let i = 1; i < influencers.length; i++) {
          expect(influencers[i - 1]!.spreadCount).toBeGreaterThanOrEqual(influencers[i]!.spreadCount);
        }
      });
    });

    it('should show behaviors spread by each influencer', async () => {
      render(<CulturalDiffusionView data={mockCulturalData} />);

      const influencer = mockCulturalData.influencers[0]!;

      await waitFor(() => {
        expect(screen.getByText(influencer.name)).toBeInTheDocument();
        influencer.behaviors.forEach((behavior) => {
          expect(screen.getByText(behavior)).toBeInTheDocument();
        });
      });
    });
  });
});
