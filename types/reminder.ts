export interface Reminder {
  id: number
  bankCode: string
  loanType: string
  loanCode: string
  reminderDate: string
  message: string
  isAttended: boolean
  attendedAt: string | null
  createdAt: string
}
