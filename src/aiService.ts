export async function analyzeCourseWithAI(pdfText: string, prompt: string): Promise<string> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: `${prompt}\n\nContenu du cours :\n${pdfText}` })
    });
    const data = await response.json();
    return data.result || "Aucune réponse reçue de l'IA.";
  } catch (error) {
    console.error("Erreur:", error);
    return "Erreur de connexion avec l'intelligence artificielle.";
  }
}
