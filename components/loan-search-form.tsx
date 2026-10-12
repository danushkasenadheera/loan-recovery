"use client"

import { useState, useTransition, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Search, Loader2 } from "lucide-react"
import { LoanNameSearchResults } from "@/components/loan-name-search-results"
import type { LoanSearchResult } from "@/types/loan-search"

interface LoanType {
  code: string
  description: string
}

interface Props {
  loanTypes: LoanType[]
  userBankCode: string
  defaultValues: {
    bankCode: string
    loanType: string
    loanCode: string
  }
}

const NAME_MIN_LENGTH = 3
const NAME_SEARCH_DEBOUNCE_MS = 300
const NAME_SEARCH_MAX_RESULTS = 50

export function LoanSearchForm({ loanTypes, userBankCode, defaultValues }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isHeadOffice = userBankCode === "000"

  const [mode, setMode] = useState<"code" | "name">("name")

  // Shared across modes
  const [bankCode, setBankCode] = useState(defaultValues.bankCode)

  // Code-search mode (unchanged behaviour)
  const [loanType, setLoanType] = useState(defaultValues.loanType)
  const [loanCode, setLoanCode] = useState(defaultValues.loanCode)

  const canSearch = bankCode.trim() !== "" && loanType !== "" && loanCode.trim() !== ""

  const handleSearch = () => {
    if (!canSearch) return
    startTransition(() => {
      const params = new URLSearchParams({ BankCode: bankCode, LoanType: loanType, LoanCode: loanCode })
      router.push(`/dashboard?${params}`)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch()
  }

  // Name-search mode
  const [name, setName] = useState("")
  const [nameLoanType, setNameLoanType] = useState("")
  const [results, setResults] = useState<LoanSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [nameDropdownOpen, setNameDropdownOpen] = useState(false)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const runNameSearch = useCallback(async (term: string, bank: string, type: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setSearchLoading(true)
    setSearchError(null)
    try {
      const params = new URLSearchParams({ BankCode: bank, Name: term })
      if (type) params.set("LoanType", type)
      const res = await fetch(`/api/loan-search?${params}`, { signal: controller.signal })
      if (controller.signal.aborted) return
      if (!res.ok) {
        setSearchError("Unable to search. Try again.")
        setResults([])
        return
      }
      setResults(await res.json())
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      setSearchError("Unable to search. Try again.")
      setResults([])
    } finally {
      if (!controller.signal.aborted) setSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    if (mode !== "name") return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    const trimmed = name.trim()
    if (trimmed.length < NAME_MIN_LENGTH || bankCode.trim() === "") {
      abortRef.current?.abort()
      setSearchLoading(false)
      setResults([])
      setSearchError(null)
      return
    }

    debounceTimer.current = setTimeout(() => {
      runNameSearch(trimmed, bankCode, nameLoanType)
    }, NAME_SEARCH_DEBOUNCE_MS)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [mode, name, bankCode, nameLoanType, runNameSearch])

  const handleSelectResult = (loan: LoanSearchResult) => {
    setNameDropdownOpen(false)
    startTransition(() => {
      const params = new URLSearchParams({ BankCode: loan.bankCode, LoanType: loan.loanType, LoanCode: loan.loanCode })
      router.push(`/dashboard?${params}`)
    })
  }

  const handleNameFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setNameDropdownOpen(true)
  }

  const handleNameBlur = () => {
    // Delayed so a result button's onMouseDown fires before the dropdown unmounts.
    blurTimer.current = setTimeout(() => setNameDropdownOpen(false), 150)
  }

  useEffect(() => {
    return () => { if (blurTimer.current) clearTimeout(blurTimer.current) }
  }, [])

  const nameTrimmedLength = name.trim().length
  const nameHint =
    bankCode.trim() === ""
      ? "Enter a bank code to search."
      : nameTrimmedLength === 0
      ? null
      : nameTrimmedLength < NAME_MIN_LENGTH
      ? `Type at least ${NAME_MIN_LENGTH} characters.`
      : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-secondary">
          <Search className="h-5 w-5" />
          Loan Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "code" | "name")}>
          <TabsList>
            <TabsTrigger value="name">Name</TabsTrigger>
            <TabsTrigger value="code">Loan Code</TabsTrigger>
          </TabsList>

          <TabsContent value="code" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Bank Code</Label>
                <Input
                  value={bankCode}
                  onChange={(e) => isHeadOffice && setBankCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!isHeadOffice}
                  className={!isHeadOffice ? "bg-muted cursor-not-allowed" : ""}
                  placeholder="000"
                />
                {!isHeadOffice && (
                  <p className="text-xs text-muted-foreground">Auto-populated from your account</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Loan Type</Label>
                <Select value={loanType} onValueChange={setLoanType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select loan type" />
                  </SelectTrigger>
                  <SelectContent>
                    {loanTypes.map((type) => (
                      <SelectItem key={type.code} value={type.code}>
                        {type.code} — {type.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Loan Code</Label>
                <Input
                  value={loanCode}
                  onChange={(e) => setLoanCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="00000028"
                  maxLength={8}
                />
                <p className="text-xs text-muted-foreground">8-digit loan code</p>
              </div>
            </div>

            <Button onClick={handleSearch} disabled={!canSearch || isPending} className="w-full">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Get Loan
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="name" className="space-y-4 pt-4">
            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Bank Code</Label>
                  <Input
                    value={bankCode}
                    onChange={(e) => isHeadOffice && setBankCode(e.target.value)}
                    disabled={!isHeadOffice}
                    className={!isHeadOffice ? "bg-muted cursor-not-allowed" : ""}
                    placeholder="000"
                  />
                  {!isHeadOffice && (
                    <p className="text-xs text-muted-foreground">Auto-populated from your account</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Loan Type</Label>
                  <Select value={nameLoanType || "all"} onValueChange={(v) => setNameLoanType(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {loanTypes.map((type) => (
                        <SelectItem key={type.code} value={type.code}>
                          {type.code} — {type.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Obtainer Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => { setName(e.target.value); setNameDropdownOpen(true) }}
                    onFocus={handleNameFocus}
                    onBlur={handleNameBlur}
                    placeholder="e.g. Perera"
                    autoComplete="off"
                  />
                </div>
              </div>

              {nameDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-80 overflow-y-auto rounded-md border bg-popover shadow-md">
                  <LoanNameSearchResults
                    results={results}
                    loading={searchLoading}
                    error={searchError}
                    hint={nameHint}
                    capped={results.length === NAME_SEARCH_MAX_RESULTS}
                    onSelect={handleSelectResult}
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
