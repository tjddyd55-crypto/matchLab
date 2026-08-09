"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createGymProductAction,
  deleteGymProductAction,
  reorderGymProductsAction,
  updateGymProductAction,
} from "@/features/gym-products/actions";
import { GymProductCategory } from "@/lib/enums";
import { formatWon } from "@/lib/format-won";
import { gymProductCategoryLabel } from "@/lib/gym-products/labels";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export type GymProductRow = {
  id: string;
  name: string;
  category: string;
  defaultPrice: number;
  isActive: boolean;
  sortOrder: number;
  memo: string | null;
};

function CategoryOptions() {
  return (
    <>
      <option value={GymProductCategory.equipment}>장비</option>
      <option value={GymProductCategory.apparel}>의류</option>
      <option value={GymProductCategory.protective_gear}>보호장비</option>
      <option value={GymProductCategory.goods}>용품</option>
      <option value={GymProductCategory.other}>기타</option>
    </>
  );
}

export function GymProductsManager({
  initialProducts,
}: {
  initialProducts: GymProductRow[];
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editor, setEditor] = useState<
    null | { mode: "create" } | { mode: "edit"; product: GymProductRow }
  >(null);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  function syncFromServer() {
    router.refresh();
  }

  function run(
    fn: () => Promise<{ ok: boolean; error?: { message?: string } }>,
    okMsg: string,
    onOk?: () => void,
  ) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error?.message ?? "처리에 실패했습니다.");
        return;
      }
      setMessage(okMsg);
      onOk?.();
      syncFromServer();
    });
  }

  function persistOrder(next: GymProductRow[]) {
    setProducts(next);
    run(
      () => reorderGymProductsAction(next.map((p) => p.id)),
      "상품 순서를 저장했습니다.",
    );
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...products];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[index]!;
    next[index] = next[j]!;
    next[j] = tmp;
    persistOrder(next);
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const from = products.findIndex((p) => p.id === dragId);
    const to = products.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) {
      setDragId(null);
      return;
    }
    const next = [...products];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    setDragId(null);
    persistOrder(next);
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-700" role="status">
          {message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => setEditor({ mode: "create" })}>
          + 상품 등록
        </Button>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs text-matchon-text-secondary">
            <tr>
              <th className="py-2 pr-2">순서</th>
              <th className="py-2 pr-2">상품명</th>
              <th className="py-2 pr-2">카테고리</th>
              <th className="py-2 pr-2">기본가격</th>
              <th className="py-2 pr-2">상태</th>
              <th className="py-2">관리</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-matchon-text-secondary"
                >
                  등록된 상품이 없습니다. 자주 판매하는 용품을 등록해 주세요.
                </td>
              </tr>
            ) : (
              products.map((p, index) => (
                <tr
                  key={p.id}
                  className="border-t border-matchon-border"
                  draggable
                  onDragStart={() => setDragId(p.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(p.id)}
                >
                  <td className="py-2 pr-2">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={pending || index === 0}
                        onClick={() => move(index, -1)}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={pending || index === products.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        ↓
                      </Button>
                    </div>
                  </td>
                  <td className="py-2 pr-2 font-medium">{p.name}</td>
                  <td className="py-2 pr-2">
                    {gymProductCategoryLabel(p.category)}
                  </td>
                  <td className="py-2 pr-2">{formatWon(p.defaultPrice)}</td>
                  <td className="py-2 pr-2">
                    {p.isActive ? "판매중" : "비활성"}
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() =>
                          setEditor({ mode: "edit", product: p })
                        }
                      >
                        수정
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={pending}
                        onClick={() => {
                          if (!window.confirm("이 상품을 삭제할까요?")) return;
                          run(
                            () => deleteGymProductAction(p.id),
                            "상품을 삭제했습니다.",
                            () =>
                              setProducts((prev) =>
                                prev.filter((x) => x.id !== p.id),
                              ),
                          );
                        }}
                      >
                        삭제
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {products.map((p, index) => (
          <li
            key={p.id}
            className="rounded-xl border border-matchon-border bg-white p-3"
            draggable
            onDragStart={() => setDragId(p.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(p.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-matchon-text-secondary">
                  {gymProductCategoryLabel(p.category)} ·{" "}
                  {formatWon(p.defaultPrice)} ·{" "}
                  {p.isActive ? "판매중" : "비활성"}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={pending || index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={pending || index === products.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </Button>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setEditor({ mode: "edit", product: p })}
              >
                수정
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm("이 상품을 삭제할까요?")) return;
                  run(
                    () => deleteGymProductAction(p.id),
                    "상품을 삭제했습니다.",
                    () =>
                      setProducts((prev) => prev.filter((x) => x.id !== p.id)),
                  );
                }}
              >
                삭제
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog
        open={!!editor}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
      >
        <DialogContent
          className={cn(
            "max-w-md gap-0 p-0 sm:max-w-md",
            "max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none max-md:rounded-t-2xl",
          )}
        >
          <DialogHeader className="border-b border-matchon-border px-4 py-4">
            <DialogTitle>
              {editor?.mode === "edit" ? "상품 수정" : "상품 등록"}
            </DialogTitle>
            <DialogDescription>
              매출 등록 시 선택할 수 있는 용품을 관리합니다.
            </DialogDescription>
          </DialogHeader>
          {editor ? (
            <form
              className="space-y-3 px-4 py-4"
              action={(fd) => {
                if (editor.mode === "create") {
                  run(
                    () => createGymProductAction(fd),
                    "상품을 등록했습니다.",
                    () => setEditor(null),
                  );
                  return;
                }
                run(
                  () => updateGymProductAction(editor.product.id, fd),
                  "상품을 수정했습니다.",
                  () => setEditor(null),
                );
              }}
            >
              <label className="block space-y-1 text-sm">
                <span>상품명 *</span>
                <input
                  name="name"
                  required
                  defaultValue={
                    editor.mode === "edit" ? editor.product.name : ""
                  }
                  className={matchonFieldInputClass}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>카테고리</span>
                <select
                  name="category"
                  className={matchonFieldInputClass}
                  defaultValue={
                    editor.mode === "edit"
                      ? editor.product.category
                      : GymProductCategory.goods
                  }
                >
                  <CategoryOptions />
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span>기본가격 *</span>
                <input
                  name="defaultPrice"
                  inputMode="numeric"
                  required
                  defaultValue={
                    editor.mode === "edit"
                      ? String(editor.product.defaultPrice)
                      : "0"
                  }
                  className={matchonFieldInputClass}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>메모</span>
                <input
                  name="memo"
                  defaultValue={
                    editor.mode === "edit" ? (editor.product.memo ?? "") : ""
                  }
                  className={matchonFieldInputClass}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isActive"
                  value="true"
                  defaultChecked={
                    editor.mode === "edit" ? editor.product.isActive : true
                  }
                />
                판매 여부
              </label>
              <DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditor(null)}
                >
                  취소
                </Button>
                <Button type="submit" disabled={pending}>
                  저장
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
