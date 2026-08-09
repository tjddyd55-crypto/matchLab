"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  SalesEntryModal,
  type SalesEntryMemberOption,
  type SalesEntryProductOption,
} from "@/components/domain/gym-sales/SalesEntryModal";

export function GymSalesRegisterCta({
  members,
  products,
  label = "매출 등록",
}: {
  members: SalesEntryMemberOption[];
  products: SalesEntryProductOption[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <SalesEntryModal
        open={open}
        onOpenChange={setOpen}
        members={members}
        products={products}
      />
    </>
  );
}
