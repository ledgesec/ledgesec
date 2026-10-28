import { DEMO_KICKER, DEMO_LEDE, DEMO_TITLE } from "@/fsd/pages/demo/copy";
import { SiteFrame } from "@/fsd/pages/site/frame";
import { PAGE_KICKER, PAGE_LEDE, PAGE_MAIN, PAGE_TITLE } from "@/fsd/pages/site/space";
import { DemoForm } from "@/features/demo/ui/demo-form";

export function DemoPage({ host }: { host: string }) {
  return (
    <SiteFrame host={host}>
      <main className={`${PAGE_MAIN} grid items-start gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]`}>
        <div>
          <p className={PAGE_KICKER}>{DEMO_KICKER}</p>
          <h1 className={PAGE_TITLE}>{DEMO_TITLE}</h1>
          <p className={PAGE_LEDE}>{DEMO_LEDE}</p>
        </div>
        <DemoForm />
      </main>
    </SiteFrame>
  );
}
