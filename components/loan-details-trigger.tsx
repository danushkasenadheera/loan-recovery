"use client"

import { useState } from "react"
import { FileSearch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoanDetailsModal } from "@/components/loan-details-modal"

interface LoanDetailsTriggerProps {
  loan: { bankCode: string; loanType: string; loanCode: string; referenceNo: string; loanName?: string | null }
}

export function LoanDetailsTrigger({ loan }: LoanDetailsTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setOpen(true)}>
        <FileSearch className="h-4 w-4" />
        View Loan Details
      </Button>
      <LoanDetailsModal open={open} onOpenChange={setOpen} loan={loan} />
    </>
  )
}
