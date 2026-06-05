"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="login">
      <section className="card">
        <div className="brand">
          <h1>Laser Treat Esthetica</h1>
          <p>The app could not start correctly.</p>
        </div>
        <p className="notice">{error.message || "A client-side error occurred."}</p>
        <button className="gold" onClick={reset}>Try Again</button>
      </section>
    </main>
  );
}
