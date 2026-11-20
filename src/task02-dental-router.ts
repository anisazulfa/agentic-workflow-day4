/**
 * APA: Router dokter gigi. Dari keluhan singkat pasien, AI mengarahkan pasien ke satu dokter spesialis.
 * KENAPA: Pasien sering tidak paham harus bertemu dengan dokter spesialis apa. Router memilih dokter yang tepat
 *         dari daftar, jadi hasilnya bisa diprediksi dan tidak mengarang.
 * ALUR: keluhan -> classify-specialist (AI pilih 1 spesialis dari daftar + alasannya)
 *               -> route (menyusun output untuk pasien)
 */
import { Pipeline } from "@anvia/core/pipeline";
import z, { object } from "zod";
import { askAiJson } from "./shared";

const drgSpecialists = {
    "drg. Umum": "pemeriksaan awal, scaling, tambal sederhana, cabut gigi sederhana",
    "drg. Spesialis Konservasi Gigi": "tambal rumit, perawatan saluran akar",
    "drg. Spesialis Ortodonti": "kawat gigi, gigi berjejal, rahang tidak simetris",
    "drg. Spesialis Bedah Mulut": "impaksi gigi, kista, operasi rahang",
    "drg. Spesialis Periodonsia": "gusi berdarah, radang gusi, gigi goyang",
    "drg. Spesialis Prostodonsia": "gigi tiruan, mahkota gigi, implan",
    "drg. Spesialis Gigi Anak": "gigi dan gusi pada anak-anak"
};


const specialistNames = Object.keys(drgSpecialists) as [string, ...string[]];
const specialistSchema = z.enum(specialistNames);
const inputSchema = z.object({ patientComplaints: z.string().min(10) });

const Classification = z.object({
    specialist: specialistSchema,
    reason: z.string().describe("The reason why this specialist fits (in one sentence)"),
});

const specialists = Object.entries(drgSpecialists)
    .map(([name, handles]) => `-${name}: ${handles}`)
    .join("\n")

const instructions = `
You direct the patient to the right specialist doctor according to their complaint.
Choose exactly one of the doctors from this list:
${specialists}
With rules: choose the doctor to visit first, if the patient is child then choose drg. Spesialis Anak,
if the complaint is uncler then choose drg. Umum.
`

const dentalRouter = new Pipeline({
    id: "dental-router",
    inputSchema,
})
.step({
    id: "choose-specialist",
    run: async ({ input }) => {
        const result = await askAiJson(
            `Patient complaint: ${input.patientComplaints}`,
            Classification,
            instructions,
        );
        const { specialist, reason } = Classification.parse(result.output);
        return { complaint: input.patientComplaints, specialist, reason };
    },
})
.step({
    id: "routing",
    run: ({ input }) =>
        `Keluhan: ${input.complaint}\nBerdasarkan keluhan anda, kami sarankan untuk menemui ${input.specialist}. Alasan: ${input.reason}`,
})

const patientComplaints = [
    "Anak saya berumur 7 tahun, gigi depannya sudah goyang",
    "Gigi bungsu saya mulai tumbuh dan terasa sakit sekali hingga sakit kepala",
    "Saya merasa gigi saya berjejal dan tidak rapi dan ingin merapihkannya",
];

patientComplaints.forEach(async (complaint) => {
    const output = await dentalRouter.run({ input: { patientComplaints : complaint } });
    console.log(output);
}); 

// console.log(specialistNames)
