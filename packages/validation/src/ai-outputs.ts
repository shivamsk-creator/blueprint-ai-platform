import { z } from "zod";
import { REQUIREMENT_PRIORITIES, REQUIREMENT_TYPES } from "@blueprint/domain";

export const aiDiscoveryOutputSchema = z.object({
  summary: z.string().min(1),
  clarificationQuestions: z.array(
    z.object({
      category: z.string().min(1),
      questionText: z.string().min(5),
      rationale: z.string().default(""),
      priority: z.enum(REQUIREMENT_PRIORITIES).default("medium"),
    })
  ),
  proposedRequirements: z.array(
    z.object({
      requirementType: z.enum(REQUIREMENT_TYPES).default("functional"),
      title: z.string().min(3),
      description: z.string().min(5),
      priority: z.enum(REQUIREMENT_PRIORITIES).default("medium"),
      acceptanceCriteria: z.array(z.string()).default([]),
    })
  ),
});

export const aiArtifactOutputSchema = z.object({
  summary: z.string().min(1),
  sections: z.array(
    z.object({
      sectionKey: z.string().min(1),
      heading: z.string().min(1),
      orderIndex: z.number().int().min(0),
      bodyMarkdown: z.string().min(1),
    })
  ).min(1),
});

export const aiSectionOutputSchema = z.object({
  sectionKey: z.string().min(1),
  heading: z.string().min(1),
  bodyMarkdown: z.string().min(1),
  changeSummary: z.string().default("AI section regeneration candidate"),
});

export const aiValidationOutputSchema = z.object({
  issues: z.array(
    z.object({
      ruleCode: z.string().min(2),
      severity: z.enum(["blocker", "high", "medium", "low", "info"]),
      title: z.string().min(3),
      description: z.string().min(5),
      recommendation: z.string().default(""),
    })
  ),
});

export type AIDiscoveryOutput = z.infer<typeof aiDiscoveryOutputSchema>;
export type AIArtifactOutput = z.infer<typeof aiArtifactOutputSchema>;
export type AISectionOutput = z.infer<typeof aiSectionOutputSchema>;
export type AIValidationOutput = z.infer<typeof aiValidationOutputSchema>;
