import { z } from "zod";

import { paginatedSchema } from "@/types/pagination";

/** Active curriculum subject (SubjectSerializer). */
export const subjectSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  code: z.string(),
  is_active: z.boolean(),
});

export type Subject = z.infer<typeof subjectSchema>;

export const subjectListSchema = paginatedSchema(subjectSchema);
export type SubjectList = z.infer<typeof subjectListSchema>;

/** Topic within a subject (CurriculumTopicSerializer). */
export const topicSchema = z.object({
  id: z.number().int().positive(),
  subject: z.number().int().positive(),
  grade_level: z.number().int(),
  code: z.string(),
  title: z.string(),
  description: z.string(),
  sequence_order: z.number().int(),
});

export type Topic = z.infer<typeof topicSchema>;

export const topicListSchema = paginatedSchema(topicSchema);
export type TopicList = z.infer<typeof topicListSchema>;
