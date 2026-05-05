import { DocsSidebar } from '@/components/docs/DocsSidebar';
import { Footer } from '@/components/layout/Footer';
import { docsNavigation } from '@/lib/docs-navigation';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ocean-background min-h-screen">
      <div className="container pt-40 pb-16 lg:pb-24">
        <div className="flex gap-6 lg:gap-12">
          <DocsSidebar navigation={docsNavigation} />
          <main className="flex-1 min-w-0 max-w-3xl">
            <article className="prose">
              {children}
            </article>
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
