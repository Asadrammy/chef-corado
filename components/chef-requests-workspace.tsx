"use client"

import * as React from "react"

import { ChefRequestRow, ChefRequestTable } from "@/components/chef-request-table"
import { ProposalForm } from "@/components/proposal-form"
import { Separator } from "@/components/ui/separator"

export type ChefWorkspaceProps = {
  requests: ChefRequestRow[]
}

export function ChefRequestsWorkspace({ requests }: ChefWorkspaceProps) {
  const [activeRequestId, setActiveRequestId] = React.useState<string | null>(null)

  const selectedRequest = React.useMemo(() => {
    return requests.find((request) => request.id === activeRequestId)
  }, [activeRequestId, requests])

  const handleSuccess = React.useCallback(() => {
    setActiveRequestId(null)
  }, [])

  return (
    <div className="space-y-6">
      <ChefRequestTable
        data={requests}
        activeRequestId={activeRequestId}
        onSendProposal={(requestId) => setActiveRequestId(requestId)}
      />

      {activeRequestId && selectedRequest && (
        <div className="rounded-3xl border border-border/80 bg-background/80 p-6 shadow">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">Proposal for</p>
            <h2 className="text-2xl font-semibold">{selectedRequest.location}</h2>
            <p className="text-sm text-muted-foreground">
              Event on {new Date(selectedRequest.eventDate).toLocaleDateString()} • Budget ${selectedRequest.budget.toFixed(2)}
            </p>
          </div>
          <Separator className="my-4" />
          <ProposalForm requestId={selectedRequest.id} onSuccess={handleSuccess} />
        </div>
      )}
    </div>
  )
}
