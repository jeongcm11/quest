export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'failed', detail: 'GEMINI_API_KEY가 설정되지 않았어요. (등록 후 Redeploy 필요)' });
  }
  try {
    const { image, mediaType, count = 5 } = req.body;
    const prompt = `사진 속 학습 내용만 근거로 퀴즈 ${count}개를 만들어. 사진에 없는 사실은 절대 만들지 마.
글자를 읽기 어렵다면 {"error":"unreadable"} 만 출력해.
객관식(mc)은 choices 중 하나와 answer가 글자까지 똑같아야 해. OX(ox)의 answer는 O 또는 X.
JSON만 출력:
{"questions":[{"type":"mc|ox|short","q":"문제","choices":["..."],"answer":"정답","explain":"해설"}]}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 50000);
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
      {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ inline_data: { mime_type: mediaType, data: image } }, { text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );
    const d = await r.json();
    clearTimeout(timer);
    if (!r.ok) {
      return res.status(500).json({ error: 'failed', detail: 'Gemini 오류 ' + r.status + ': ' + String(d.error?.message || '').slice(0, 200) });
    }
    const raw = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) {
      return res.status(500).json({ error: 'failed', detail: 'AI 응답이 비었거나 형식이 달라요.' + (d.promptFeedback?.blockReason ? ' (차단: ' + d.promptFeedback.blockReason + ')' : '') });
    }
    res.status(200).json(JSON.parse(m[0]));
  } catch (e) {
    res.status(500).json({ error: 'failed', detail: e.name === 'AbortError' ? 'AI 응답이 너무 오래 걸려요. 문제 수를 줄이거나 글씨가 큰 사진으로 다시 시도해 주세요.' : '처리 중 오류: ' + e.message });
  }
}
