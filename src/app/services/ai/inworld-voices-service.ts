import aiConfig from "#config/ai.js";

interface MinimalFetchResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
  body: { getReader(): ReadableStreamDefaultReader<Uint8Array> } | null;
}

export interface InworldVoice {
  voiceId: string;
  displayName: string;
  languages: string[];
  gender: "female" | "male" | "unknown";
}

const FEMALE_VOICE_IDS = new Set([
  "Loretta",
  "Darlene",
  "Marlene",
  "Evelyn",
  "Celeste",
  "Pippa",
  "Tessa",
  "Abby",
  "Claire",
  "Serena",
  "Lauren",
  "Jessica",
  "Chloe",
  "Veronica",
  "Victoria",
  "Miranda",
  "Anjali",
  "Saanvi",
  "Amina",
  "Kelsey",
  "Kayla",
  "Ashley",
  "Deborah",
  "Elizabeth",
  "Julia",
  "Pixie",
  "Olivia",
  "Priya",
  "Sarah",
  "Wendy",
  "Hana",
  "Luna",
  "Xiaoyin",
  "Xinyi",
  "Jing",
  "Katrien",
  "Lore",
  "Hélène",
  "Johanna",
  "Orietta",
  "Asuka",
  "Minji",
  "Yoona",
  "Maitê",
  "Lupita",
  "Svetlana",
  "Elena",
  "Riya",
  "Yael",
  "Nour",
]);

const MALE_VOICE_IDS = new Set([
  "Hank",
  "Liam",
  "Callum",
  "Hamish",
  "Graham",
  "Rupert",
  "Mortimer",
  "Snik",
  "Arjun",
  "Oliver",
  "Simon",
  "Elliot",
  "James",
  "Gareth",
  "Vinny",
  "Ethan",
  "Tyler",
  "Jason",
  "Sebastian",
  "Victor",
  "Malcolm",
  "Nate",
  "Brian",
  "Derek",
  "Evan",
  "Jake",
  "Grant",
  "Alex",
  "Craig",
  "Dennis",
  "Edward",
  "Hades",
  "Mark",
  "Ronald",
  "Shaun",
  "Theodore",
  "Timothy",
  "Dominus",
  "Clive",
  "Carter",
  "Blake",
  "Yichen",
  "Erik",
  "Lennart",
  "Alain",
  "Mathieu",
  "Étienne",
  "Josef",
  "Gianni",
  "Satoshi",
  "Hyunwoo",
  "Seojun",
  "Szymon",
  "Wojciech",
  "Heitor",
  "Diego",
  "Miguel",
  "Rafael",
  "Dmitry",
  "Nikolai",
  "Manoj",
  "Oren",
  "Omar",
]);

function resolveGender(voiceId: string): "female" | "male" | "unknown" {
  if (FEMALE_VOICE_IDS.has(voiceId)) return "female";
  if (MALE_VOICE_IDS.has(voiceId)) return "male";
  return "unknown";
}

export async function getDefaultTeacherVoice(
  langLearning: string,
): Promise<{
  voiceId: string;
  displayName: string;
  gender: "female" | "male" | "unknown";
}> {
  const fallback = {
    voiceId: "Ashley",
    displayName: "Ashley",
    gender: "female" as const,
  };

  if (langLearning === "en") {
    return { voiceId: "Jessica", displayName: "Jessica", gender: "female" };
  }
  if (langLearning === "es") {
    return { voiceId: "Diego", displayName: "Diego", gender: "male" };
  }

  const voices = await fetchInworldVoices();
  const forLang = voices.filter((v) => v.languages.includes(langLearning));
  if (forLang.length > 0) {
    const first = forLang[0]!;
    return {
      voiceId: first.voiceId,
      displayName: first.displayName,
      gender: first.gender,
    };
  }
  return fallback;
}

export async function fetchInworldVoices(): Promise<InworldVoice[]> {
  const { apiKey } = aiConfig.inworld;
  if (apiKey === "") return [];

  let json: unknown;
  try {
    const response = (await fetch("https://api.inworld.ai/tts/v1/voices", {
      method: "GET",
      headers: { Authorization: `Basic ${apiKey}` },
    })) as unknown as MinimalFetchResponse;
    if (!response.ok) return [];
    json = await response.json();
  } catch {
    return [];
  }

  if (typeof json !== "object" || json === null) return [];
  const rawVoices = (json as Record<string, unknown>)["voices"];
  if (!Array.isArray(rawVoices)) return [];

  return rawVoices
    .filter(
      (v): v is Record<string, unknown> =>
        typeof v === "object" &&
        v !== null &&
        !(v as Record<string, unknown>)["isCustom"],
    )
    .map((v) => ({
      voiceId: typeof v["voiceId"] === "string" ? v["voiceId"] : "",
      displayName: typeof v["displayName"] === "string" ? v["displayName"] : "",
      languages: Array.isArray(v["languages"])
        ? (v["languages"] as unknown[]).filter(
            (l): l is string => typeof l === "string",
          )
        : [],
      gender: resolveGender(
        typeof v["voiceId"] === "string" ? v["voiceId"] : "",
      ),
    }))
    .filter((v) => v.voiceId !== "");
}
