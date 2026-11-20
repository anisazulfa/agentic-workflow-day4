/**
 * APA: Extractor form appointment dokter gigi. Pasien menulis bebas, AI isi formulir.
 * KENAPA: Admin tidak perlu mengetik ulang data pasien, dan pasien bisa tahu estimasi biaya.
 * ALUR: teks bebas -> clean-text -> extract-form (AI isi formulir)
 */ 
import { Pipeline } from "@anvia/core/pipeline";
import z from "zod";
import { model } from "./shared";

const AppointmentSchema = z.object({
    name: z.string().describe("Patient's name."),
    age: z.string().describe("Patient's age"),
    phone: z.string().describe("Patient's phone number"),
    complaint: z.string().describe("Short summary of the dental complaint"),
    estimatedCost: z.string().describe("Estimated cost range in Rupiah taken only from the price list in the instructions. " +
        "If the complaint does not match the list, return: Perlu pemeriksaan dokter dulu"),
});
const priceList = `
Price List Bunga Dental
- Check-up (kontrol rutin): 100.000-300.000
- Scaling (membersihkan gigi dari karang gigi): 300.000 - 600.000
- Tambal gigi (menambal gigi berlubang): 250.000 - 700.000
- Cabut gigi (mencabut gigi yang goyang, patah, rusak, dan gigi bungsu): 300.000 - 1.000.000
- Perawatan saluran akar: 1.500.000 - 4.000.000
`

const dentalAppointment = new Pipeline({
    id: "dental-appointment",
    inputSchema: z.object({ text: z.string().min(10) }),
})
.step({
    id: "clean",
    run: ({ input }) => input.text.replace(/\+s/g, " "). trim(), 
})
.extract({
    id: "extract",
    model,
    outputSchema: AppointmentSchema,
    instructions: "Extract the information from patient's massage. If information's field missing, return None." +
        "For estimatedCost, match the complaint to the closest treatment in the price list and use only this list:" + priceList,
    text: ({ input }) => input,
})

const result = await dentalAppointment.run({
    input: { text: " Halo aku Ria, perempuan, kelahiran 2002, no hp 081798982323. Setiap aku makan keras gigiku sakit dan makanan suka masuk dalem gigi." }
})
console.log(result.output)