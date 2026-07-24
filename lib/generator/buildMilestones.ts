// Per SPEC.md Rule 3: milestone pricing is deterministic code, NOT an LLM call.
// Milestone titles must be < 40 chars (PPH limit). Amounts must sum exactly to budget.

import type { MilestoneItem } from '@/lib/types';

// Phase templates per job type
const MILESTONE_TEMPLATES: Record<string, string[]> = {
  fullstack: [
    'Project Setup & Architecture',
    'Backend API Development',
    'Frontend UI Implementation',
    'Integration & Testing',
    'Deployment & Handover',
  ],
  ai: [
    'Data Analysis & Model Design',
    'Model Development & Training',
    'API Integration & Backend',
    'Frontend & User Interface',
    'Testing & Deployment',
  ],
  mobile: [
    'App Architecture & Setup',
    'Core Features Development',
    'UI/UX Implementation',
    'API Integration & Testing',
    'App Store Submission',
  ],
  hybrid: [
    'Architecture & Setup',
    'Backend & AI Development',
    'Frontend Development',
    'Integration & QA',
    'Deployment & Documentation',
  ],
};

export function buildMilestones(
  budget: number,
  jobType: 'fullstack' | 'ai' | 'mobile' | 'hybrid',
  keyRequirements: string[],
): MilestoneItem[] {
  const templates = MILESTONE_TEMPLATES[jobType] ?? MILESTONE_TEMPLATES.fullstack;

  // Determine number of phases: 3 for small budgets, 4 for medium, 5 for large
  let phaseCount: number;
  if (budget < 300) {
    phaseCount = 3;
  } else if (budget < 800) {
    phaseCount = 4;
  } else {
    phaseCount = 5;
  }

  // Adjust phase count if key_requirements suggests simpler scope
  if (keyRequirements.length <= 3) {
    phaseCount = Math.min(phaseCount, 3);
  }

  const titles = templates.slice(0, phaseCount);

  // Distribute budget across phases
  // Weighting: first phase 15%, last phase 20%, rest split evenly
  const amounts = distributeBudget(budget, phaseCount);

  return titles.map((title, i) => ({
    title: title.slice(0, 39), // Enforce < 40 char limit
    amount: amounts[i],
  }));
}

function distributeBudget(total: number, count: number): number[] {
  if (count === 1) return [total];

  // Round to nearest whole number, ensure exact sum
  const base = Math.floor(total / count);
  const amounts = Array(count).fill(base);
  const remainder = total - base * count;
  amounts[amounts.length - 1] += remainder; // Add remainder to last milestone

  return amounts;
}
