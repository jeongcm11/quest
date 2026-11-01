export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { image, mediaType, count = 5 } = req.body;
    const prompt = `사진 속 학습 내용만 근거로 퀴즈 ${count}개를 만들어. 사진에 없는 사실은 절대 만들지 마.
글자를 읽기 어렵다면 {"error":"unreadable"} 만 출력해.
JSON만 출력:
{"questions":[{"type":"mc|ox|short","q":"문제","choices":["..."],"answer":"정답","explain":"해설"}]}`;
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: mediaType, data: image } },
            { text: prompt }
          ]}],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );
    const d = await r.json();
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.status(200).json(JSON.parse(text));
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
}
