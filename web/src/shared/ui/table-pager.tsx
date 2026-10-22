import { Button } from "@/shared/ui/button";

export function TablePager({
  prev,
  next,
  onPrev,
  onNext,
}: {
  prev: string | null;
  next: string | null;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-end gap-2">
      <Button type="button" variant="outline" size="sm" disabled={!prev} onClick={onPrev}>
        Prev
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={!next} onClick={onNext}>
        Next
      </Button>
    </div>
  );
}
