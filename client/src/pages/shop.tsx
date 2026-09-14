import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Coins, ShoppingCart, Star, Plus, Trash2, Sparkles, Pencil, Download, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { rowsToCSV, downloadCSV, type CSVExport } from "@/lib/csv-export";
import { DashCard } from "@/components/dash-ui";
import type { ShopItem, UserProgress } from "@/../../shared/schema";

type InventoryGroup = {
  itemId: number;
  item?: ShopItem;
  unused: number;
  used: number;
  purchaseIds: number[];
};

// Common emojis for shop items
const EMOJI_OPTIONS = [
  "🎁", "⭐", "💎", "🏆", "👑", "🎯", "🔥", "⚡", "🌟", "💰",
  "🎨", "📚", "🎮", "🎪", "🎭", "🎬", "🎵", "🎸", "🎹", "🎺",
  "⚔️", "🛡️", "🏹", "🗡️", "🪄", "🔮", "📿", "💍", "👗", "🎩",
  "🍕", "🍔", "🍟", "🍿", "🧃", "☕", "🍰", "🍪", "🎂", "🍫",
  "🚗", "🚀", "🛸", "✈️", "⛵", "🏰", "🏠", "🏖️", "🏔️", "🌈",
  "🌸", "🌺", "🌻", "🌷", "🌹", "🌿", "🍀", "🌾", "🌱", "🌲",
  "🌳", "🌴", "🌵", "🍁", "🍂", "🍃", "🌊", "☀️", "🌙", "💫",
  "✨", "🌤️", "⛅", "💧", "❄️", "🐶", "🐱", "🦊", "🐻", "🐼",
  "🦁", "🐸", "🐧", "🦄", "🐝", "🦋", "🐢", "🦎", "🐙", "🐳",
];

// Pure async builder (fetches its own data) so the Settings page's "Export All" master
// export can build this CSV without the Item Shop page being mounted.
export async function buildShopItemsCSVExport(): Promise<CSVExport> {
  const r = await fetch("/api/shop/items", { credentials: "include" });
  const items: any[] = await r.json();
  const headers = ["Name", "Description", "Cost (Gold)", "Icon", "Category", "Is Global", "Created At"];
  const rows = items.map(i => [i.name, i.description, i.cost, i.icon, i.category, i.isGlobal ? "Yes" : "No", i.createdAt]);
  return { folder: "Shop", filename: "shop-items.csv", content: rowsToCSV(headers, rows) };
}

const TONES = ["violet", "mint", "amber", "coral"] as const;
function toneFor(id: number) {
  return TONES[id % TONES.length];
}

export default function Shop() {
  const [purchaseItemId, setPurchaseItemId] = useState<number | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemCost, setNewItemCost] = useState("");
  const [newItemIcon, setNewItemIcon] = useState("🎁");

  const { toast } = useToast();

  const { data: progress = { goldTotal: 0 } as UserProgress } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });

  const { data: shopItems = [], refetch: refetchItems, isLoading: itemsLoading } = useQuery<ShopItem[]>({
    queryKey: ["/api/shop/items"],
  });

  const { data: inventory = [], isLoading: inventoryLoading } = useQuery<InventoryGroup[]>({
    queryKey: ["/api/inventory"],
  });

  const goldTotal = progress.goldTotal ?? 0;
  const inStock = inventory.filter((inv) => inv.unused > 0);
  const totalUnused = inStock.reduce((s, i) => s + i.unused, 0);

  const consumeMutation = useMutation({
    mutationFn: async (purchaseId: number) => {
      const response = await apiRequest("PATCH", `/api/purchases/${purchaseId}/use`);
      return response.json();
    },
    onSuccess: (_data, purchaseId) => {
      const invItem = inventory.find((inv) => inv.purchaseIds?.includes(purchaseId));
      toast({ title: "Used", description: `Enjoyed ${invItem?.item?.name || "your reward"}.` });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
    },
    onError: () => {
      toast({ title: "Couldn't use item", description: "Please try again.", variant: "destructive" });
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest("POST", "/api/shop/purchase", { itemId });
      return response.json();
    },
    onSuccess: (_data, itemId) => {
      const item = shopItems.find((i) => i.id === itemId);
      toast({ title: "Purchased", description: item ? `Bought ${item.name} for ${item.cost.toLocaleString()} gold.` : "Purchase complete." });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setPurchaseItemId(null);
    },
    onError: (error: any) => {
      toast({ title: "Purchase failed", description: error.message || "Insufficient gold.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest("DELETE", `/api/shop/items/${itemId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Reward removed" });
      refetchItems();
      setDeleteItemId(null);
    },
    onError: () => {
      toast({ title: "Couldn't delete", description: "Please try again.", variant: "destructive" });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (itemData: { name: string; description: string; cost: number; icon: string }) => {
      const response = await apiRequest("POST", "/api/shop/items", itemData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Reward added" });
      refetchItems();
      setShowAddModal(false);
      setNewItemName("");
      setNewItemDescription("");
      setNewItemCost("");
      setNewItemIcon("🎁");
    },
    onError: () => {
      toast({ title: "Couldn't add reward", description: "Please try again.", variant: "destructive" });
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: async ({ itemId, cost }: { itemId: number; cost: number }) => {
      const response = await apiRequest("PATCH", `/api/shop/items/${itemId}`, { cost });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Price updated" });
      refetchItems();
      setEditingItemId(null);
      setEditPrice("");
    },
    onError: () => {
      toast({ title: "Couldn't update price", description: "Please try again.", variant: "destructive" });
    },
  });

  const handleAddItem = () => {
    const cost = parseInt(newItemCost);
    if (!newItemName || !newItemDescription || !cost || cost <= 0) {
      toast({ title: "Missing info", description: "Fill in every field with a valid, positive cost.", variant: "destructive" });
      return;
    }
    addItemMutation.mutate({ name: newItemName, description: newItemDescription, cost, icon: newItemIcon });
  };

  const handleStartEdit = (itemId: number, currentPrice: number) => {
    setEditingItemId(itemId);
    setEditPrice(currentPrice.toString());
  };

  const handleSavePrice = (itemId: number) => {
    const cost = parseInt(editPrice);
    if (!cost || cost <= 0) {
      toast({ title: "Invalid price", description: "Enter a price greater than 0.", variant: "destructive" });
      return;
    }
    updatePriceMutation.mutate({ itemId, cost });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditPrice("");
  };

  const purchaseItem = shopItems.find((i) => i.id === purchaseItemId);
  const deleteItem = shopItems.find((i) => i.id === deleteItemId);
  const missingGold = purchaseItem ? Math.max(0, purchaseItem.cost - goldTotal) : 0;

  return (
    <div className="min-h-screen bg-[var(--dash-bg)] md:pt-16">
      <main className="dash-content">
        {/* Heading */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight tracking-[-0.04em] text-[var(--dash-ink)] sm:text-[28px]">Shop</h1>
            <p className="mt-1 text-sm text-[var(--dash-muted)]">Exchange earned gold for things that make real life better.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              onClick={() => { buildShopItemsCSVExport().then((exp) => downloadCSV(exp.filename, exp.content)); }}
              variant="outline"
              className="dash-focus gap-1.5 border-[var(--dash-line)] bg-[var(--dash-surface)] text-[var(--dash-muted)] hover:text-[var(--dash-ink)]"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
            <Button
              onClick={() => setShowAddModal(true)}
              className="dash-focus gap-1.5 bg-[var(--dash-violet)] text-white hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> Add item
            </Button>
          </div>
        </div>

        {/* Balance */}
        <section
          aria-label="Available balance"
          className="mb-6 flex items-center justify-between gap-4 rounded-[10px] border p-[19px]"
          style={{ borderColor: "var(--dash-violet)", background: "var(--dash-violet-soft)" }}
        >
          <div>
            <p className="dash-mono text-[var(--dash-muted)]">Available balance</p>
            <p className="mt-1 text-[25px] font-bold tracking-[-0.05em] text-[var(--dash-ink)] sm:text-[29px]">
              {goldTotal.toLocaleString()} <span className="text-sm font-semibold text-[var(--dash-amber)]">gold</span>
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: "var(--dash-amber-soft)" }}>
            <Coins aria-hidden className="h-6 w-6" style={{ color: "var(--dash-amber)" }} />
          </div>
        </section>

        {/* Catalog */}
        <section className="mb-8">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-[var(--dash-ink)]">Rewards catalog</h2>
              <p className="mt-0.5 text-xs text-[var(--dash-muted)]">Choose a reward. You've earned the right to enjoy it.</p>
            </div>
            <span className="shrink-0 text-xs text-[var(--dash-muted)]">
              {shopItems.length} item{shopItems.length === 1 ? "" : "s"}
            </span>
          </div>

          {itemsLoading ? (
            <p className="py-8 text-center text-sm text-[var(--dash-muted)]">Loading rewards…</p>
          ) : shopItems.length === 0 ? (
            <DashCard className="p-10 text-center">
              <ShoppingCart aria-hidden className="mx-auto mb-3 h-10 w-10 text-[var(--dash-violet)] opacity-40" />
              <p className="mb-1 font-medium text-[var(--dash-ink)]">No rewards yet</p>
              <p className="mb-4 text-sm text-[var(--dash-muted)]">Add your first reward to start spending gold on it.</p>
              <Button onClick={() => setShowAddModal(true)} className="bg-[var(--dash-violet)] text-white hover:opacity-90">
                <Plus className="mr-1.5 h-4 w-4" /> Add item
              </Button>
            </DashCard>
          ) : (
            <div className="dash-catalog-grid">
              {shopItems.map((item) => {
                const tone = toneFor(item.id);
                const canAfford = goldTotal >= item.cost;
                const isEditing = editingItemId === item.id;
                return (
                  <div
                    key={item.id}
                    className="dash-focus flex min-h-[177px] flex-col rounded-[10px] border border-[var(--dash-line)] bg-[var(--dash-surface)] p-[17px] shadow-[var(--dash-shadow)] transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="grid h-10 w-10 place-items-center rounded-[10px] text-lg"
                        style={{ background: `var(--dash-${tone}-soft)`, color: `var(--dash-${tone})` }}
                        aria-hidden
                      >
                        {item.icon}
                      </span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            aria-label={`New price for ${item.name}`}
                            className="h-8 w-20 border-[var(--dash-line)] text-sm"
                            autoFocus
                          />
                          <Button size="icon" className="h-8 w-8 shrink-0 bg-[var(--dash-mint)] text-white hover:opacity-90" onClick={() => handleSavePrice(item.id)} aria-label="Save price">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={handleCancelEdit} aria-label="Cancel edit">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex shrink-0 items-center gap-1 font-bold" style={{ color: "var(--dash-amber)" }}>
                          <Coins aria-hidden className="h-3.5 w-3.5" />
                          {item.cost.toLocaleString()}
                          {!item.isGlobal && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item.id, item.cost)}
                              aria-label={`Edit price for ${item.name}`}
                              className="dash-focus ml-0.5 rounded p-0.5 text-[var(--dash-muted)] hover:text-[var(--dash-violet)]"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <h3 className="mb-1 mt-3.5 text-[15px] font-semibold text-[var(--dash-ink)]">{item.name}</h3>
                    <p className="text-xs text-[var(--dash-muted)]">{item.description}</p>

                    <div className="mt-auto flex items-center justify-between gap-2 pt-3.5">
                      {item.isGlobal ? (
                        <span className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold" style={{ background: "var(--dash-violet-soft)", color: "var(--dash-violet)" }}>
                          <Star aria-hidden className="h-3 w-3" /> Default
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteItemId(item.id)}
                          className="dash-focus flex items-center gap-1 rounded text-[11px] text-[var(--dash-muted)] hover:text-[var(--dash-coral)]"
                        >
                          <Trash2 aria-hidden className="h-3 w-3" /> Remove
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPurchaseItemId(item.id)}
                        className="dash-focus rounded-md px-2 py-1 text-[11px] font-semibold"
                        style={canAfford
                          ? { background: "var(--dash-violet-soft)", color: "var(--dash-violet)" }
                          : { background: "var(--dash-surface-2)", color: "var(--dash-coral)" }}
                      >
                        {canAfford ? "Available" : "Not enough gold"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Inventory */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-[var(--dash-ink)]">Your inventory</h2>
              <p className="mt-0.5 text-xs text-[var(--dash-muted)]">Items you've purchased and can use.</p>
            </div>
            <span className="shrink-0 text-xs font-medium" style={{ color: "var(--dash-mint)" }}>
              {inventoryLoading ? "" : totalUnused > 0 ? `${totalUnused} available` : "Empty"}
            </span>
          </div>

          <div className="rounded-[10px] border p-[18px]" style={{ borderColor: "var(--dash-mint)", background: "var(--dash-surface)" }}>
            {inventoryLoading ? (
              <p className="py-6 text-center text-sm text-[var(--dash-muted)]">Loading inventory…</p>
            ) : inStock.length === 0 ? (
              <div className="py-6 text-center">
                <Sparkles aria-hidden className="mx-auto mb-2 h-9 w-9 opacity-40" style={{ color: "var(--dash-mint)" }} />
                <p className="font-medium text-[var(--dash-ink)]">No items in inventory</p>
                <p className="mt-1 text-sm text-[var(--dash-muted)]">Purchase a reward from the catalog to add it here.</p>
              </div>
            ) : (
              <div className="dash-inventory-grid">
                {inStock.map((invItem) => {
                  const isPendingThis = consumeMutation.isPending && consumeMutation.variables === invItem.purchaseIds[0];
                  return (
                    <div key={invItem.itemId} className="rounded-lg border border-[var(--dash-line)] p-[13px]">
                      <span className="grid h-9 w-9 place-items-center rounded-lg text-base" style={{ background: "var(--dash-violet-soft)", color: "var(--dash-violet)" }} aria-hidden>
                        {invItem.item?.icon || "🎁"}
                      </span>
                      <p className="mt-2 truncate text-sm font-semibold text-[var(--dash-ink)]">{invItem.item?.name || "Unknown item"}</p>
                      <p className="truncate text-xs text-[var(--dash-muted)]">{invItem.item?.description}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="dash-mono normal-case" style={{ color: "var(--dash-mint)" }}>{invItem.unused} available</span>
                        <Button
                          size="sm"
                          onClick={() => consumeMutation.mutate(invItem.purchaseIds[0])}
                          disabled={isPendingThis}
                          className="h-7 shrink-0 bg-[var(--dash-mint)] px-2.5 text-xs text-white hover:opacity-90"
                        >
                          {isPendingThis ? "Using…" : "Use one"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Purchase confirmation */}
      <Dialog open={purchaseItemId !== null} onOpenChange={(open) => !open && setPurchaseItemId(null)}>
        <DialogContent className="border-[var(--dash-line)] bg-[var(--dash-surface)] text-[var(--dash-ink)] sm:max-w-md">
          {purchaseItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5 text-[var(--dash-ink)]">
                  <span className="grid h-10 w-10 place-items-center rounded-[10px] text-lg" style={{ background: "var(--dash-violet-soft)" }} aria-hidden>
                    {purchaseItem.icon}
                  </span>
                  {purchaseItem.name}
                </DialogTitle>
                <DialogDescription className="text-[var(--dash-muted)]">{purchaseItem.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 rounded-lg border border-[var(--dash-line)] p-3.5 text-sm">
                <div className="flex justify-between"><span className="text-[var(--dash-muted)]">Price</span><span className="font-semibold" style={{ color: "var(--dash-amber)" }}>{purchaseItem.cost.toLocaleString()} gold</span></div>
                <div className="flex justify-between"><span className="text-[var(--dash-muted)]">Current balance</span><span className="font-semibold text-[var(--dash-ink)]">{goldTotal.toLocaleString()} gold</span></div>
                <div className="flex justify-between border-t border-[var(--dash-line)] pt-2">
                  <span className="text-[var(--dash-muted)]">Balance after purchase</span>
                  <span className="font-semibold" style={{ color: goldTotal >= purchaseItem.cost ? "var(--dash-mint)" : "var(--dash-coral)" }}>
                    {(goldTotal - purchaseItem.cost).toLocaleString()} gold
                  </span>
                </div>
              </div>
              {missingGold > 0 && (
                <p className="text-xs" style={{ color: "var(--dash-coral)" }}>
                  You need {missingGold.toLocaleString()} more gold to buy this.
                </p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setPurchaseItemId(null)} className="border-[var(--dash-line)]">Cancel</Button>
                <Button
                  onClick={() => purchaseMutation.mutate(purchaseItem.id)}
                  disabled={purchaseMutation.isPending || missingGold > 0}
                  className="bg-[var(--dash-violet)] text-white hover:opacity-90"
                >
                  <ShoppingCart className="mr-1.5 h-4 w-4" /> {purchaseMutation.isPending ? "Purchasing…" : "Purchase"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteItemId !== null} onOpenChange={(open) => !open && setDeleteItemId(null)}>
        <AlertDialogContent className="border-[var(--dash-line)] bg-[var(--dash-surface)] text-[var(--dash-ink)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteItem?.name}"?</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--dash-muted)]">
              This removes it from the catalog. Any copies already in your inventory are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
              className="bg-[var(--dash-coral)] text-white hover:opacity-90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add reward */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-[var(--dash-line)] bg-[var(--dash-surface)] text-[var(--dash-ink)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[var(--dash-ink)]">Add a reward</DialogTitle>
            <DialogDescription className="text-[var(--dash-muted)]">Make the next milestone tangible.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="e.g. Long bath" className="border-[var(--dash-line)]" />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={newItemDescription} onChange={(e) => setNewItemDescription(e.target.value)} placeholder="What makes this worth earning?" rows={2} className="border-[var(--dash-line)]" />
            </div>
            <div>
              <Label htmlFor="cost">Cost in gold</Label>
              <Input id="cost" type="number" inputMode="numeric" min={1} value={newItemCost} onChange={(e) => setNewItemCost(e.target.value)} placeholder="250" className="border-[var(--dash-line)]" />
            </div>
            <div>
              <Label className="mb-2 block">Icon</Label>
              <div className="grid max-h-44 grid-cols-8 gap-1.5 overflow-y-auto rounded-lg border border-[var(--dash-line)] p-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewItemIcon(emoji)}
                    aria-pressed={newItemIcon === emoji}
                    className="dash-focus rounded-md p-2 text-2xl transition-colors hover:bg-[var(--dash-surface-2)]"
                    style={newItemIcon === emoji ? { background: "var(--dash-violet-soft)", boxShadow: "0 0 0 2px var(--dash-violet)" } : undefined}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="border-[var(--dash-line)]">Cancel</Button>
            <Button onClick={handleAddItem} disabled={addItemMutation.isPending} className="bg-[var(--dash-violet)] text-white hover:opacity-90">
              <Plus className="mr-1.5 h-4 w-4" /> {addItemMutation.isPending ? "Adding…" : "Add reward"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
