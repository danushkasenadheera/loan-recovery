export interface EmployeeOption {
  empNo: string
  empName: string | null
}

export interface EmployeeLoanItem {
  loanNo: string
  memberId: string | null
  memberName: string | null
  loanAmount: number | null
  dateOfIssue: string | null
  nic: string | null
  noOfInstallments: number | null
  interestRate: number | null
  installmentCapital: number | null
  installmentInterest: number | null
  loanBalance: number | null
}

export interface EmployeeLoanReport {
  empNo: string
  empName: string | null
  loanType: string
  loanTypeDescription: string | null
  loans: EmployeeLoanItem[]
  totalLoanAmount: number
  totalLoanBalance: number
}
