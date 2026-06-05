const endpoints: Array<[string, string]> = [
  ['GET', '/api/v1/exercises'],
  ['GET', '/api/v1/exercises/search'],
  ['GET', '/api/v1/exercises/bodyparts'],
  ['GET', '/api/v1/exercises/muscles'],
  ['GET', '/api/v1/exercises/equipments'],
  ['GET', '/api/v1/exercises/{exerciseId}'],
  ['POST', '/api/v1/exercises'],
  ['PATCH', '/api/v1/exercises/{exerciseId}'],
  ['DELETE', '/api/v1/exercises/{exerciseId}'],
  ['GET', '/api/v1/bodyparts'],
  ['GET', '/api/v1/muscles'],
  ['GET', '/api/v1/equipments'],
  ['POST', '/api/v1/sync'],
  ['GET', '/api/v1/sync/status'],
  ['GET/POST', '/api/v1/workout-tasks'],
  ['GET/PATCH/DELETE', '/api/v1/workout-tasks/{id}'],
  ['PATCH', '/api/v1/workout-tasks/{id}/start'],
  ['PATCH', '/api/v1/workout-tasks/{id}/complete'],
  ['PATCH', '/api/v1/workout-tasks/{id}/items/{itemId}/complete'],
  ['GET', '/api/v1/liveness'],
];

export default function Home() {
  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ fontSize: 32, marginBottom: 4 }}>
        🏋️ Gym Exercise &amp; Workout-Task API
      </h1>
      <p style={{ color: '#9aa7b4', marginTop: 0 }}>
        Next.js + MongoDB. Mirrors &amp; extends the ExerciseDB v1 dataset.
      </p>

      <div style={{ display: 'flex', gap: 12, margin: '24px 0' }}>
        <a
          href="/docs"
          style={{
            background: '#2f81f7',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          API Docs (Swagger)
        </a>
        <a
          href="/api/v1/liveness"
          style={{
            border: '1px solid #30363d',
            color: '#e6edf3',
            padding: '10px 18px',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          Health check
        </a>
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 8 }}>Endpoints</h2>
      <div
        style={{
          border: '1px solid #21262d',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {endpoints.map(([method, path], i) => (
          <div
            key={path + method}
            style={{
              display: 'flex',
              gap: 12,
              padding: '8px 14px',
              background: i % 2 ? '#0d1117' : '#11161d',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 13,
            }}
          >
            <span style={{ color: '#7ee787', minWidth: 140 }}>{method}</span>
            <span>{path}</span>
          </div>
        ))}
      </div>

      <p style={{ color: '#6e7681', fontSize: 12, marginTop: 32 }}>
        Exercise data © AscendAPI (ExerciseDB). https://ascendapi.com
      </p>
    </main>
  );
}
