export default function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="error-banner" role="alert">
      <strong>Investigation failed:</strong> {message}
    </div>
  );
}
