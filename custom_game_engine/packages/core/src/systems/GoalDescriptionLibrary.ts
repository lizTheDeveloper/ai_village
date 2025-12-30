/**
 * Goal Description Library
 *
 * Enhanced goal descriptions using the four blended writer voices.
 * Makes agent goals feel personal, meaningful, and entertaining.
 *
 * Voices: Humane Satirist + Cosmic Pragmatist + Baroque Encyclopedist + Quiet Mythweaver
 */

import type { PersonalityComponent } from '../components/PersonalityComponent.js';

export interface GoalTemplate {
  description: string;
  motivation: string;
  milestones: string[];
}

/**
 * Get enhanced goal descriptions based on personality.
 * Returns different variations to keep goals feeling unique.
 */
export class GoalDescriptionLibrary {
  /**
   * Mastery Goals - Becoming skilled at something
   */
  static getMasteryGoal(personality: PersonalityComponent, skill: string): GoalTemplate {
    const highConscientiousness = personality.conscientiousness > 0.7;
    const lowWorkEthic = (personality.workEthic || 0.5) < 0.3;

    if (highConscientiousness && !lowWorkEthic) {
      // Dedicated perfectionist
      return {
        description: `Achieve true mastery of ${skill}`,
        motivation: `Excellence isn't a goal, it's a compulsion. Mediocrity in ${skill} offends me on a personal level, and I intend to remedy this situation through systematic practice, obsessive attention to detail, and possibly too little sleep.`,
        milestones: [
          `Practice ${skill} with the dedication of someone who's confused it with their identity`,
          `Complete enough ${skill} tasks that muscle memory becomes involuntary philosophy`,
          `Reach the point where others ask for ${skill} advice (reluctantly accept this responsibility)`,
        ],
      };
    } else if (lowWorkEthic) {
      // Reluctant aspirant
      return {
        description: `Get decent at ${skill}, eventually`,
        motivation: `I should probably learn ${skill}. Not for noble reasons—more because it keeps coming up and it would be convenient to not be terrible at it. This is growth, technically. Just very gradual, low-effort growth.`,
        milestones: [
          `Practice ${skill} when the mood strikes (or when absolutely necessary)`,
          `Achieve "good enough" status, which is honestly fine`,
          `Maybe become competent if I stumble into enough practice by accident`,
        ],
      };
    } else {
      // Balanced learner
      return {
        description: `Develop solid ${skill} proficiency`,
        motivation: `${skill.charAt(0).toUpperCase() + skill.slice(1)} matters here. Not in some grand cosmic sense—just practically, tangibly, in the way skills matter when you need them and don't have them yet. I can learn this. Will learn this. The gap between "can't" and "can" is just practice wearing different clothes.`,
        milestones: [
          `Build ${skill} fundamentals through consistent practice`,
          `Work ${skill} into my routine until it feels natural`,
          `Reach genuine competence—the kind where problems become puzzles instead of obstacles`,
        ],
      };
    }
  }

  /**
   * Social Goals - Building relationships
   */
  static getSocialGoal(personality: PersonalityComponent): GoalTemplate {
    const veryExtraverted = personality.extraversion > 0.8;
    const introvert = personality.extraversion < 0.3;
    const highAgreeableness = personality.agreeableness > 0.7;

    if (veryExtraverted && highAgreeableness) {
      // Social butterfly
      return {
        description: 'Befriend absolutely everyone in the village',
        motivation: `People are fascinating! Each one a unique collection of stories, skills, worries, and weird habits. I want to know them all—their names, their crafts, what makes them laugh, what keeps them up at night. This village is full of potential friends who just don't know it yet.`,
        milestones: [
          `Strike up conversations with villagers I don't know well (this will be easy and delightful)`,
          `Remember important details about people (birthdays, preferences, that thing they mentioned once)`,
          `Become the person who knows everyone and connects them when they need each other`,
        ],
      };
    } else if (introvert) {
      // Selective connector
      return {
        description: 'Cultivate a few meaningful friendships',
        motivation: `I don't need many friends. Just a few people who understand that comfortable silence is a valid form of communication, who won't take offense when I need to disappear for a while to recharge. Quality over quantity—a principle I'm applying to relationships the way others apply it to crafted goods.`,
        milestones: [
          `Find one or two people whose company doesn't drain my limited social battery`,
          `Build trust slowly, like roots finding purchase in stone—patient, persistent, real`,
          `Create friendships that don't require constant maintenance to survive`,
        ],
      };
    } else {
      // Community builder
      return {
        description: 'Build genuine connections in the village',
        motivation: `Community isn't automatic. It's built through small gestures: remembering names, offering help, showing up. We're all stuck in this village together—might as well make it pleasant through the deliberate cultivation of goodwill and mutual support.`,
        milestones: [
          `Have real conversations, not just transactional exchanges`,
          `Help neighbors with their work (the kind of help that's remembered)`,
          `Become someone the village considers reliable, trustworthy, present`,
        ],
      };
    }
  }

  /**
   * Creative Goals - Making something new
   */
  static getCreativeGoal(personality: PersonalityComponent): GoalTemplate {
    const highCreativity = (personality.creativity || 0.5) > 0.7;
    const traditional = personality.openness < 0.3;

    if (highCreativity) {
      // Artistic innovator
      return {
        description: 'Create something that didn\'t exist before',
        motivation: `The world has too much sameness in it. I see possibilities in materials, combinations nobody's tried, designs that exist fully-formed in my mind and just need hands to make them real. This isn't vanity—it's necessity. The thing I'm going to make doesn't exist yet, and that's simply wrong.`,
        milestones: [
          `Experiment with unconventional approaches until something clicks`,
          `Build the thing that's been haunting my thoughts (make it real, make it work)`,
          `Leave evidence that creativity happened here—that someone tried something new`,
        ],
      };
    } else if (traditional) {
      // Meticulous replicator
      return {
        description: 'Perfect the traditional craft',
        motivation: `Innovation is overrated. The old designs persist because they work, they're beautiful, they've survived generations of use. I want to make something so well-crafted it honors the tradition—not to break new ground, but to prove the old ground is still worth standing on.`,
        milestones: [
          `Study traditional techniques with the attention they deserve`,
          `Create something using proven methods, executed flawlessly`,
          `Demonstrate that perfecting the familiar is its own form of creation`,
        ],
      };
    } else {
      // Practical maker
      return {
        description: 'Make something useful and well-crafted',
        motivation: `I want to create something that matters—not in some abstract artistic sense, but practically. Something people use, that solves a problem, that makes daily life incrementally better. Beauty is fine but utility is sacred.`,
        milestones: [
          `Design something that addresses a real need`,
          `Build it carefully, making it both functional and durable`,
          `See it actually used, which is the real measure of successful creation`,
        ],
      };
    }
  }

  /**
   * Exploration Goals - Discovering new things
   */
  static getExplorationGoal(personality: PersonalityComponent): GoalTemplate {
    const veryOpen = personality.openness > 0.8;
    const cautious = personality.openness < 0.3;

    if (veryOpen) {
      // Fearless explorer
      return {
        description: 'Map every unexplored corner of this region',
        motivation: `The unknown calls to me with the insistence of an unanswered question. What's beyond that ridge? What grows in that valley? What have we missed because nobody bothered to look? I have to know. It's not optional. Curiosity this intense is basically a medical condition.`,
        milestones: [
          `Venture into areas marked "unexplored" on maps (or unmarked entirely)`,
          `Document what's found: resources, hazards, peculiarities, beauty`,
          `Return with knowledge that makes the world feel larger and more fully known`,
        ],
      };
    } else if (cautious) {
      // Careful surveyor
      return {
        description: 'Document nearby resources and routes',
        motivation: `I'm not seeking adventure—I'm seeking information. Knowing what's nearby, where resources are, which paths are safe: this is practical knowledge that prevents future problems. Exploration doesn't require recklessness, just methodical attention to surroundings.`,
        milestones: [
          `Survey familiar areas more carefully than before`,
          `Note resources and landmarks that might prove useful`,
          `Create reliable mental maps that turn "out there" into "known territory"`,
        ],
      };
    } else {
      // Curious wanderer
      return {
        description: 'Discover new places and hidden resources',
        motivation: `The world is larger than this village, and I'd like to see more of it. Not all of it—I'm not possessed by wanderlust. Just... more. Enough to know what else is out here, what opportunities we're missing, what the land holds beyond our usual routes.`,
        milestones: [
          `Explore areas we haven't thoroughly investigated`,
          `Find resources or locations that surprise me`,
          `Expand the boundaries of what the village considers "known"`,
        ],
      };
    }
  }

  /**
   * Security Goals - Safety and stability
   */
  static getSecurityGoal(personality: PersonalityComponent): GoalTemplate {
    const anxious = (personality.neuroticism || 0.5) > 0.7;
    const resilient = (personality.neuroticism || 0.5) < 0.3;

    if (anxious) {
      // Worry-driven preparer
      return {
        description: 'Build reserves for every foreseeable crisis',
        motivation: `The universe is indifferent to our survival, and preparation is the only reasonable response to that fact. What if the harvest fails? What if winter comes early? What if the well runs dry? These aren't hypotheticals—they're scenarios that require contingency plans and stockpiled resources. I will not be caught unprepared.`,
        milestones: [
          `Stockpile essential resources beyond immediate need`,
          `Identify vulnerabilities and address them before they become disasters`,
          `Sleep slightly better knowing I've planned for at least seven types of catastrophe`,
        ],
      };
    } else if (resilient) {
      // Pragmatic planner
      return {
        description: 'Maintain reasonable resource security',
        motivation: `Problems happen. That's not pessimism, it's pattern recognition. The solution isn't panic—it's having enough food, water, materials to weather disruption without crisis. Basic preparedness, the kind that lets you handle setbacks without drama.`,
        milestones: [
          `Keep reserves of crucial resources at sensible levels`,
          `Address obvious risks before they become problems`,
          `Achieve the kind of security that feels responsible, not paranoid`,
        ],
      };
    } else {
      // Stability seeker
      return {
        description: 'Ensure village stability and safety',
        motivation: `Security isn't just about surviving—it's about not having to worry about surviving. I want the village stable enough that we can focus on living instead of perpetually scrambling. This requires foresight, resources, and collective commitment to not being caught unprepared.`,
        milestones: [
          `Build up shared resources that benefit everyone`,
          `Address security gaps that make the village vulnerable`,
          `Create the kind of stability that lets people think past tomorrow`,
        ],
      };
    }
  }

  /**
   * Connection Goals - Deeper relationships (for introverts)
   */
  static getConnectionGoal(personality: PersonalityComponent): GoalTemplate {
    const veryIntroverted = personality.extraversion < 0.2;

    if (veryIntroverted) {
      // Deep connection seeker
      return {
        description: 'Find one person who truly understands me',
        motivation: `Most social interaction feels like performance. I'm looking for the rare connection where I don't have to perform—where silence is comfortable, where being understood doesn't require constant explanation. One genuine friendship is worth a hundred shallow acquaintances.`,
        milestones: [
          `Open up to someone who seems trustworthy (terrifying, but necessary)`,
          `Share the parts of myself I usually keep private`,
          `Build a friendship based on actual understanding, not just proximity`,
        ],
      };
    } else {
      // Selective bond builder
      return {
        description: 'Deepen existing friendships',
        motivation: `I have acquaintances. What I want are friends—the kind where you know each other's stories, where help is offered before it's asked for, where trust is built through repeated small acts of showing up. Quality relationships require investment beyond surface pleasantries.`,
        milestones: [
          `Spend meaningful time with people I already like`,
          `Move relationships from "friendly" to "friends" through consistent presence`,
          `Build connections that would survive hardship because they're rooted in mutual trust`,
        ],
      };
    }
  }

  /**
   * Recognition Goals - Being seen and valued
   */
  static getRecognitionGoal(personality: PersonalityComponent): GoalTemplate {
    const leader = (personality.leadership || 0.5) > 0.7;
    const insecure = (personality.neuroticism || 0.5) > 0.7;

    if (leader) {
      // Natural leader
      return {
        description: 'Become a trusted voice in village decisions',
        motivation: `I notice things: problems that need solving, people who aren't being heard, opportunities we're missing. And I can help coordinate solutions. Not because I need authority, but because I see what needs doing and I'm positioned to help it happen. Leadership is just organized helpfulness.`,
        milestones: [
          `Demonstrate competence in organizing collaborative efforts`,
          `Build trust by consistently following through on commitments`,
          `Become someone the village turns to when coordination is needed`,
        ],
      };
    } else if (insecure) {
      // Validation seeker
      return {
        description: 'Earn respect and recognition from others',
        motivation: `I need to know that I matter—that my work is seen, my contributions valued, my presence noticed. This isn't vanity. Or maybe it is, but it's also human. We all want evidence that we're not invisible, that what we do makes some kind of difference to someone.`,
        milestones: [
          `Do work visible enough that people notice it`,
          `Receive acknowledgment (even small) that my efforts matter`,
          `Build a reputation that makes me feel less replaceable, more real`,
        ],
      };
    } else {
      // Quiet contributor
      return {
        description: 'Be valued for my contributions',
        motivation: `I don't need fame or praise. Just recognition that what I do matters—that my work contributes something meaningful to the village. The satisfaction comes from being useful, from pulling my weight, from knowing I'm part of keeping this place functional.`,
        milestones: [
          `Consistently contribute work that helps the village`,
          `Become reliably useful in my area of skill`,
          `Earn quiet respect through sustained competent contribution`,
        ],
      };
    }
  }
}
