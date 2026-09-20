"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { FileText, Users, CreditCard, Info, ScrollText, Phone, MapPin, User } from "lucide-react"
import type { LoanDetail } from "@/types/loan-visit"

function fmtDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtNoteDate(s: string | null) {
  if (!s) return null
  const d = new Date(s)
  return {
    day: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    year: d.getFullYear().toString(),
  }
}

function fmtCurrency(n: number | null) {
  if (n == null) return "—"
  return `LKR ${n.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

export function LoanVisitsAccordion({ detail }: { detail: LoanDetail }) {
  return (
    <Accordion type="single" collapsible defaultValue="repayment" className="w-full">

      <AccordionItem value="repayment">
        <AccordionTrigger className="text-sm px-4">
          <span className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5 shrink-0 text-primary" /><span className="font-semibold">Repayment Details</span></span>
        </AccordionTrigger>
        <AccordionContent className="px-4 space-y-3 pb-4">
          <Row label="Loan Amount" value={fmtCurrency(detail.loanAmount)} />
          <Row label="Installment Amount" value={fmtCurrency(detail.installmentAmount)} />
          <Row label="Interest Rate" value={detail.interestRate != null ? `${detail.interestRate}%` : "—"} />
          <Row label="No of Instalments" value={detail.numberOfInstallments != null ? `${detail.numberOfInstallments} months` : "—"} />
          <Row label="Date of Issue" value={fmtDate(detail.dateOfIssue)} />
          <Row label="Final Payment Date" value={fmtDate(detail.finalPaymentDate)} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="loan-details">
        <AccordionTrigger className="text-sm px-4">
          <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 shrink-0 text-primary" /><span className="font-semibold">Loan Details</span></span>
        </AccordionTrigger>
        <AccordionContent className="px-4 space-y-3 pb-4">
          <Row label="Reference No" value={detail.referenceNo} />
          {detail.address && <Row label="Address" value={detail.address} />}
          {detail.blockAccountNo && <Row label="Bank Account" value={detail.blockAccountNo} />}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="guarantors">
        <AccordionTrigger className="text-sm px-4">
          <span className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="font-semibold">Guarantors ({detail.guarantors.length})</span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {detail.guarantors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No guarantors on record</p>
          ) : (
            <div className="space-y-3">
              {detail.guarantors.map((g, i) => (
                <div key={i} className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-[#111827]">{g.name ?? "—"}</p>
                  </div>
                  {g.mobile && (
                    <a
                      href={`tel:${g.mobile}`}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                    >
                      <Phone className="h-3 w-3 shrink-0" />
                      {g.mobile}
                    </a>
                  )}
                  {g.address && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3 w-3 text-[#9CA3AF] mt-0.5 shrink-0" />
                      <p className="text-xs text-[#6B7280] leading-snug">{g.address}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="additional">
        <AccordionTrigger className="text-sm px-4">
          <span className="flex items-center gap-2"><Info className="h-3.5 w-3.5 shrink-0 text-primary" /><span className="font-semibold">Loan Status</span></span>
        </AccordionTrigger>
        <AccordionContent className="px-4 space-y-4 pb-4">
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Balance</p>
            <div className="space-y-3">
              <Row label="Loan Balance" value={fmtCurrency(detail.balanceLoanAmount)} />
              <Row label="Last Paid Date" value={fmtDate(detail.dateLastPaid)} />
            </div>
          </div>
          <div className="border-t pt-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Arrears</p>
            <div className="space-y-3">
              <Row label="Arrears Installments" value={detail.arrearsInstallments != null ? `${detail.arrearsInstallments}` : "—"} />
              <Row label="Arrears Loan Amount" value={fmtCurrency(detail.arrearsLoanAmount)} />
              <Row label="Arrears Interest Amount" value={fmtCurrency(detail.arrearsInterestAmount)} />
              <Row label="Penalty Interest" value={fmtCurrency(detail.penaltyInterest)} />
              <Row label="Arrears Total Amount" value={fmtCurrency(detail.arrearsTotalAmount)} />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="loan-notes" className="border-b-0">
        <AccordionTrigger className="text-sm px-4">
          <span className="flex items-center gap-2">
            <ScrollText className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="font-semibold">Loan Notes</span>
            {detail.loanNotes.length > 0 && (
              <span className="ml-1 text-xs text-muted-foreground font-normal">({detail.loanNotes.length})</span>
            )}
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {detail.loanNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes on record.</p>
          ) : (
            <ol className="relative border-l border-muted-foreground/20 space-y-4 ml-2">
              {detail.loanNotes.map((note, i) => {
                const d = fmtNoteDate(note.date)
                return (
                  <li key={i} className="pl-4 relative">
                    <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary/70 ring-2 ring-background" />
                    {d && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {d.day} <span className="opacity-60">{d.year}</span>
                      </p>
                    )}
                    <p className="text-sm leading-snug">{note.remarks}</p>
                  </li>
                )
              })}
            </ol>
          )}
        </AccordionContent>
      </AccordionItem>

    </Accordion>
  )
}
