import TextFormatter from '@/components/TextFormatter';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Text Formatter
        </h1>
        <TextFormatter />
      </div>
    </main>
  );
}
