"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, MapPin, Tag, Bell, ClipboardList } from "lucide-react"
import { LoanRemindersModal } from "@/components/loan-reminders-modal"
import type { Loan } from "@/app/dashboard/page"

export function LoanInfoCard({ loan }: { loan: Loan }) {
  const [remindersOpen, setRemindersOpen] = useState(false)
  const hasLocation = loan.loanAddressLat != null && loan.loanAddressLang != null
  const tagHref = `/loans/${loan.bankCode}/${loan.loanType}/${loan.loanCode}/tag`

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-primary text-base font-bold">
              <FileText className="h-5 w-5 text-accent" />
              Loan Information
            </CardTitle>
            <Badge variant={hasLocation ? "default" : "secondary"}>
              {hasLocation ? "Location Tagged" : "Not Tagged"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <dt className="text-xs font-medium text-[#6B7280]">Bank Code</dt>
              <dd className="text-sm font-semibold text-[#111827] mt-0.5">{loan.bankCode}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#6B7280]">Loan Type</dt>
              <dd className="text-sm font-semibold text-[#111827] mt-0.5">{loan.loanType}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#6B7280]">Loan Code</dt>
              <dd className="text-sm font-semibold font-mono text-[#111827] mt-0.5">{loan.loanCode}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#6B7280]">Loan Name</dt>
              <dd className="text-sm font-semibold text-[#111827] mt-0.5">{loan.loanName}</dd>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <dt className="text-xs font-medium text-[#6B7280] flex items-center gap-1">
                <MapPin className="h-3 w-3 text-accent" />
                Address
              </dt>
              <dd className="text-sm font-semibold text-[#111827] mt-0.5">{loan.loanAddress || "Not provided"}</dd>
            </div>
            {hasLocation && (
              <div className="col-span-2 sm:col-span-4">
                <dt className="text-xs font-medium text-[#6B7280]">GPS Coordinates</dt>
                <dd className="text-sm font-semibold font-mono text-[#111827] mt-0.5">
                  {loan.loanAddressLat?.toFixed(6)}, {loan.loanAddressLang?.toFixed(6)}
                </dd>
              </div>
            )}
          </dl>

          <div className="pt-2 border-t flex flex-wrap gap-2">
            <Button asChild>
              <Link href={tagHref}>
                <Tag className="h-4 w-4" />
                Tag Location
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setRemindersOpen(true)} className="gap-2 bg-transparent">
              <Bell className="h-4 w-4" />
              Reminders
            </Button>
            <Button variant="outline" asChild className="gap-2 bg-transparent">
              <Link href={`/loans/${loan.bankCode}/${loan.loanType}/${loan.loanCode}/visits`}>
                <ClipboardList className="h-4 w-4" />
                Visits
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <LoanRemindersModal
        open={remindersOpen}
        onOpenChange={setRemindersOpen}
        loan={{
          bankCode: loan.bankCode,
          loanType: loan.loanType,
          loanCode: loan.loanCode,
          loanName: loan.loanName,
        }}
      />
    </>
  )
}
