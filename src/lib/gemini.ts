export async function geminiGenerate(prompt: string, model = "gemini-2.5-flash") {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Gemini request failed");
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text)
      .filter(Boolean)
      .join("") || "";

  return { raw: data, text };
}
