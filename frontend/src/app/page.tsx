import { Calculator } from "@/components/calculator/Calculator";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-4">
      <h1 className="sr-only">Calculator</h1>
      <Calculator />
      {/* Phones rarely have a physical keyboard, so the tip only shows on wider screens. */}
      <p className="hidden max-w-sm text-center text-sm text-silver sm:block">
        You can also type: numbers, + − * / ^ %, Enter to calculate, Backspace to delete, Esc to
        clear.
      </p>
    </main>
  );
}
