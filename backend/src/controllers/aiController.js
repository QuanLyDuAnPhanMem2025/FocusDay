const getTaskTypeLabel = (type) => {
  switch (type) {
    case 'meeting':
      return 'Cuộc họp';
    case 'work':
      return 'Công việc';
    case 'personal':
      return 'Cá nhân';
    default:
      return 'Mục chung';
  }
};

const fetchImpl = global.fetch || require('node-fetch');

const buildPrompt = ({ selectedDate, tasks, timezone }) => {
  const tasksForModel = (Array.isArray(tasks) ? tasks : []).map((t) => ({
    taskId: t?._id || t?.id,
    title: t?.title,
    type: t?.type,
    time: t?.time ?? null,
    durationMinutes: typeof t?.durationMinutes === 'number' ? t.durationMinutes : Number(t?.durationMinutes) || null,
    completed: Boolean(t?.completed),
    notes: t?.notes || '',
  }));

  return [
    'Bạn là trợ lý tối ưu lịch làm việc. Nhiệm vụ: xếp giờ cho các công việc trong một ngày.',
    '',
    `Ngày: ${selectedDate}`,
    `Múi giờ: ${timezone}`,
    '',
    'Quy tắc bắt buộc:',
    '- Chỉ xếp giờ cho các task có time = null (task linh hoạt).',
    '- Task đã có time là task cố định: KHÔNG thay đổi giờ của chúng.',
    '- Không được trùng giờ giữa các task.',
    '- Chỉ xếp trong khung giờ làm việc: 08:00-12:00 và 13:30-18:00.',
    '- Mỗi task dùng durationMinutes (mặc định 30 nếu thiếu).',
    '- Nếu không thể xếp, để time = null và ghi reason ngắn gọn.',
    '',
    'Đầu ra bắt buộc: TRẢ VỀ DUY NHẤT 1 JSON hợp lệ (không markdown, không giải thích ngoài JSON) theo schema:',
    '{',
    '  "selectedDate": "YYYY-MM-DD",',
    '  "fixedCount": number,',
    '  "flexibleCount": number,',
    '  "suggestions": [',
    '    { "taskId": "...", "title": "...", "time": "HH:mm" | null, "range": "HH:mm - HH:mm" | "Không đủ thời gian trống", "reason": "..." }',
    '  ]',
    '}',
    '',
    'Danh sách tasks (JSON):',
    JSON.stringify(tasksForModel),
    '',
    'Lưu ý: range phải dựa trên durationMinutes (end = start + duration).',
  ].join('\n');
};

const extractJsonText = (data) => {
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join('') ||
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    '';
  if (typeof text !== 'string') return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/```\s*$/i, '');
  return cleaned.trim();
};

const safeJsonParse = (raw) => {
  if (typeof raw !== 'string') return { ok: false, error: 'raw is not string' };
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const sliced = raw.slice(start, end + 1);
      try {
        return { ok: true, value: JSON.parse(sliced) };
      } catch {
        return { ok: false, error: 'failed to parse sliced json' };
      }
    }
    return { ok: false, error: 'failed to parse json' };
  }
};

exports.optimizeSchedule = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ msg: 'Missing GEMINI_API_KEY on server' });
    }

    const preferredModel = process.env.GEMINI_MODEL;
    const modelCandidates = [
      preferredModel,
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro-latest',
      'gemini-1.5-pro',
      'gemini-2.0-flash',
    ]
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i);

    const { selectedDate, tasks } = req.body || {};
    if (!selectedDate || typeof selectedDate !== 'string') {
      return res.status(400).json({ msg: 'selectedDate is required' });
    }

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ msg: 'tasks must be an array' });
    }

    const timezone = req.body?.timezone || 'Asia/Ho_Chi_Minh';
    const prompt = buildPrompt({ selectedDate, tasks, timezone });

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    };

    let response;
    let data;
    let lastError;
    for (const model of modelCandidates) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      data = await response.json().catch(() => null);
      if (response.ok) {
        lastError = null;
        break;
      }

      const apiStatus = data?.error?.status;
      const apiMessage = data?.error?.message;
      lastError = { model, status: response.status, apiStatus, apiMessage };

      // If model not found / not supported, try next model.
      if (response.status === 404 || apiStatus === 'NOT_FOUND') {
        continue;
      }

      // Other errors: stop early.
      return res.status(502).json({ msg: 'Gemini request failed', status: response.status, data, model });
    }

    if (!response || !response.ok) {
      return res.status(502).json({
        msg: 'Gemini request failed (no available model matched)',
        triedModels: modelCandidates,
        lastError,
        data,
      });
    }

    const raw = extractJsonText(data);
    const parsedResult = safeJsonParse(raw);
    if (!parsedResult.ok) {
      return res.status(502).json({ msg: 'Gemini returned invalid JSON', raw });
    }
    const parsed = parsedResult.value;

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.suggestions)) {
      return res.status(502).json({ msg: 'Gemini returned unexpected shape', parsed });
    }

    // Normalize output a bit
    const fixedCount = Number(parsed.fixedCount) || 0;
    const flexibleCount = Number(parsed.flexibleCount) || 0;

    const suggestions = parsed.suggestions.map((s) => ({
      taskId: s?.taskId || null,
      title: s?.title || '',
      time: s?.time ?? null,
      range: s?.range || (s?.time ? s.time : 'Không đủ thời gian trống'),
      reason: s?.reason || '',
    }));

    return res.json({
      selectedDate: parsed.selectedDate || selectedDate,
      fixedCount,
      flexibleCount,
      suggestions,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Server Error' });
  }
};
