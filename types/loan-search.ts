export interface LoanSearchResult {
  bankCode: string
  loanType: string
  loanCode: string
  loanName: string | null
  nic: string | null
  address: string | null
  balance: number | null
}
