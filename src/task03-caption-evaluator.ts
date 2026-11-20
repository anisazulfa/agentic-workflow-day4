/**
 * APA: Evaluator-optimizer untuk caption promosi makanan di medsos. AI menulis, 
 * AI menilai berdasar instruksi, lalu direvisi bila perlu.
 * KENAPA: Draf pertama LLM sering belum memenuhi kriteria. Evaluasi AI membuat caption sudah layak digunakan.
 * ALUR: { product, price } -> draft (AI menulis caption)
 *                          -> evaluate (AI juri: { passed, feedback })
 *                          -> finalize (lolos = memakai hasil draft, gagal = AI merevisi)
 */
import { Pipeline } from "@anvia/core/pipeline";
import z from "zod";
import { askAi, askAiJson } from "./shared";

const Input = z.object({
    product: z.string().min(1),
    price: z.number().positive(),
});

const Evaluation = z.object({
    passed: z.boolean(),
    feedback: z.string().describe("What to fix."),
});

const judgeInstructions = `You are a judge for Indonesian food captions.
The criteria:
- mentions the product name and the price (e.g. Rp28.000 or 28rb).
- has a call to action to order (e.g. order via WA or DM).
- cheerful tone.
- Maximum 200 characters.
Set passed to true only if all criteria are met.`;

const captionPipeline = new Pipeline({
    id: "caption-evaluator",
    inputSchema: Input,
})
.step({
    id: "draft",
    run: async ({ input }) => {
        const result = await askAi(
            `Write an Instagram promo caption in Indonesian for "${input.product}" priced at ${input.price}.`,
        );
        return { product: input.product, price: input.price, caption: result.text.trim() };
    },
})
.step({
    id: "evaluate",
    run: async ({ input }) => {
        const result = await askAiJson(
            `Product: ${input.product}\nPrice: ${input.price}\nCaption: ${input.caption}`,
            Evaluation,
            judgeInstructions,
        );
        return { ...input, ...Evaluation.parse(result.output) };
    },
})
.step({
    id: "finalize",
    run: async ({ input }) => {
        if (input.passed) {
            return { caption: input.caption, revised: false, draft: input.caption, feedback: "" };
        }
        const result = await askAi(
            `Revise this Indonesian promo caption using the feedback.\n` +
            `Requirements: mention "${input.product}" and the price ${input.price}, ` +
            `include a call to action to order, cheerful tone, maximum 200 characters.\n\n` +
            `Feedback: ${input.feedback}\n\nCaption: ${input.caption}`,
        );
        return {
            caption: result.text.trim(),
            revised: true,
            draft: input.caption,
            feedback: input.feedback,
        };
    },
});

const products = [
    { product: "Dubai chewy cookies", price: 28000 },
    { product: "Matcha latte", price: 38000 },
];

products.forEach(async (item) => {
    const result = await captionPipeline.run({ input: item });
    const output = result.output;
    console.log(output);
}); 