import { z, ZodType } from "zod";

const guideSchema = z.object({
    id: z.string(),
    type: "guideText",
    title: z.string(),
    desc: z.string(),
    icon: z.string().optional
});

export type Guide = z.infer<typeof guideSchema>

const sectionSchema = z.object({
    id: z.string(),
    type: "section",
    title: z.string(),
    list: z.array(guideSchema)
});

export type Section = z.infer<typeof guideSchema>