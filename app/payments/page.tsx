"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { paymentsActions } from "@/store/slices/paymentsSlice";
import { organizationActions } from "@/store/slices/organizationSlice";
import { RootState } from "@/store/rootReducer";
import { DashboardLayout } from "@/components/layout";
import { PageHeader, EmptyState } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Receipt, Check, Calendar, AlertTriangle, ArrowUpDown, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PaymentStatus = "all" | "succeeded" | "pending" | "failed";

type DbPayment = {
  id: string;
  amount: number;
  status: "succeeded" | "pending" | "failed";
  method: string;
  description: string;
  invoiceUrl?: string | null;
  createdAt: string;
};

export default function PaymentsPage() {
  const { organization, user } = useAuth();
  const dispatch = useDispatch();
  const payments = useSelector((state: RootState) => state.payments.payments);
  const [orgOptions, setOrgOptions] = useState<{ id: string; name: string }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [newAmount, setNewAmount] = useState("");
  const [newMethod, setNewMethod] = useState<"card" | "bank_transfer" | "paypal">("card");
  const [newDescription, setNewDescription] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const effectiveOrganizationId = organization?.id || user?.organizationId || selectedOrgId || "";

  useEffect(() => {
    if (!effectiveOrganizationId) return;
    dispatch(paymentsActions.fetchPaymentsRequest({ organizationId: effectiveOrganizationId }));
  }, [effectiveOrganizationId, dispatch]);

  function reloadPayments() {
    if (!effectiveOrganizationId) return;
    dispatch(paymentsActions.fetchPaymentsRequest({ organizationId: effectiveOrganizationId }));
  }

  function addPayment() {
    if (!effectiveOrganizationId || !newAmount || !newDescription.trim()) return;
    
    const payload = {
      organizationId: effectiveOrganizationId,
      amount: Math.round(Number(newAmount) * 100),
      method: newMethod,
      status: "succeeded",
      description: newDescription.trim(),
      currency: "usd",
    };

    dispatch(paymentsActions.createPaymentRequest({
      payload,
      resolve: () => {
        setNewAmount("");
        setNewDescription("");
        reloadPayments();
      }
    }));
  }

  function deletePayment(id: string) {
    setIsDeleting(true);
    dispatch(paymentsActions.deletePaymentRequest({
      id,
      resolve: () => {
        setIsDeleting(false);
        setDeleteDialogOpen(false);
        setPaymentToDelete(null);
        reloadPayments();
      },
      reject: () => {
        setIsDeleting(false);
      }
    }));
  }

  function confirmDeletePayment(id: string) {
    setPaymentToDelete(id);
    setDeleteDialogOpen(true);
  }

  useEffect(() => {
    if (organization?.id || user?.organizationId) return;
    dispatch(organizationActions.loadOrganizationsRequest({
      resolve: (orgs) => {
        const items = (orgs ?? []).map((o: any) => ({ id: o.id, name: o.name }));
        setOrgOptions(items);
        if (!selectedOrgId && items.length > 0) setSelectedOrgId(items[0].id);
      }
    }));
  }, [organization?.id, user?.organizationId, selectedOrgId, dispatch]);

  const filteredPayments = useMemo(
    () =>
      payments
        .filter((payment) => {
          const matchesSearch = payment.description.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
          return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
        }),
    [payments, searchQuery, statusFilter, sortOrder]
  );

  const totalPaid = payments.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "succeeded":
        return <Check className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Calendar className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "succeeded":
        return "default" as const;
      case "pending":
        return "secondary" as const;
      default:
        return "destructive" as const;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Payment History" description="View and manage all payment transactions" />
        {!organization?.id && !user?.organizationId && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Organization</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {orgOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">${(totalPaid / 100).toFixed(2)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-yellow-600">${(pendingAmount / 100).toFixed(2)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{payments.length}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />All Transactions</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-6 grid gap-3 md:grid-cols-4">
              <Input placeholder="Amount (USD)" type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
              <Select value={newMethod} onValueChange={(v) => setNewMethod(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="paypal">Paypal</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Description" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
              <Button onClick={addPayment}>Add Payment</Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search transactions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PaymentStatus)}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="succeeded">Succeeded</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}>
                <ArrowUpDown className="mr-2 h-4 w-4" />{sortOrder === "desc" ? "Newest First" : "Oldest First"}
              </Button>
            </div>

            {filteredPayments.length === 0 ? (
              <EmptyState icon={Receipt} title="No transactions found" description={searchQuery || statusFilter !== "all" ? "Try adjusting your search or filters" : "No payment history yet"} />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center ${payment.status === "succeeded" ? "bg-green-100" : payment.status === "pending" ? "bg-yellow-100" : "bg-red-100"}`}>{getStatusIcon(payment.status)}</div>
                            <div><p className="font-medium">{payment.description}</p><p className="text-xs text-muted-foreground">{payment.id}</p></div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">${(payment.amount / 100).toFixed(2)}</TableCell>
                        <TableCell><Badge variant={getStatusBadgeVariant(payment.status)}>{payment.status}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{payment.method === "card" ? "Card" : payment.method}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {payment.invoiceUrl && (
                              <Button variant="ghost" size="icon" asChild>
                                <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                  <span className="sr-only">Download Invoice</span>
                                </a>
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => confirmDeletePayment(payment.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Payment Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open && !isDeleting) { setDeleteDialogOpen(false); setPaymentToDelete(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this payment record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setPaymentToDelete(null); }} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => paymentToDelete && deletePayment(paymentToDelete)} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
