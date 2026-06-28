export interface Guarantor {
  name: string | null
  address: string | null
  mobile: string | null
}

export interface LoanDetail {
  bankCode: string
  loanType: string
  loanCode: string
  referenceNo: string
  loanName: string | null
  address: string | null
  blockAccountNo: string | null
  loanAmount: number | null
  dateOfIssue: string | null
  installmentAmount: number | null
  finalPaymentDate: string | null
  interestRate: number | null
  numberOfInstallments: number | null
  loanAddressLat: number | null
  loanAddressLang: number | null
  guarantors: Guarantor[]
  balanceLoanAmount: number | null
  dateLastPaid: string | null
  nic: string | null
  homePhone: string | null
  mobilePhone: string | null
  arrearsInstallments: number | null
  arrearsLoanAmount: number | null
  arrearsInterestAmount: number | null
  arrearsTotalAmount: number | null
  penaltyInterest: number | null
  loanNotes: LoanNote[]
}

export interface LoanOwnerAccount {
  accNo: string | null
  balance: number | null
}

export interface LoanNote {
  remarks: string | null
  date: string | null
}

export interface LoanPaymentEntry {
  accountNo: string | null
  date: string | null
  remarks: string | null
  openingBalance: number
  principal: number
  interest: number
  sequence: number
  penalty: number
  branchCode: string | null
  runningPrincipalBalance: number
}

export interface LoanPaymentTotals {
  totalPrincipal: number
  totalInterest: number
  totalPenalty: number
  totalPaidAmount: number
  loanBalance: number
}

export interface LoanSummary {
  loanNo: string | null
  openingPrincipal: number
  noOfInstallmentsPaid: number
  principalPaid: number
  interestPaid: number
  penaltyPaid: number
  remainingPrincipalBalance: number
  interestToBePaidUptoToday: number
  penaltyInterestToBePaidUptoToday: number
  totalOutstanding: number
}

export interface LoanDetailReport {
  summary: LoanSummary | null
  paymentHistory: LoanPaymentEntry[]
  totals: LoanPaymentTotals | null
}

export interface LoanVisitListItem {
  id: number
  userName: string
  visitedAt: string
  visitLat: number
  visitLang: number
  partPaymentMade: boolean
  partPaymentDate: string | null
  partPaymentAmount: number | null
  hasGuarantor1Signature: boolean
  guarantor1SignedAt: string | null
  hasGuarantor2Signature: boolean
  guarantor2SignedAt: string | null
  hasManagerNote: boolean
}

export interface LoanVisitDetail {
  id: number
  userName: string
  visitedAt: string
  visitLat: number
  visitLang: number
  obtainerStatement: string
  obtainerSignature: string
  partPaymentMade: boolean
  partPaymentDate: string | null
  partPaymentAmount: number | null
  officerInstructions: string
  officerSignature: string
  guarantor1Signature: string | null
  guarantor1SignedAt: string | null
  guarantor2Signature: string | null
  guarantor2SignedAt: string | null
  managerNote: string | null
  managerSignature: string | null
  managerNoteAt: string | null
}
