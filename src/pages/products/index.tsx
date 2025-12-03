import Layout from "@/components/Layout";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
}

interface ProductFormState {
  name: string;
  price: string;
  description: string;
}

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>({
    name: "",
    price: "",
    description: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);

  const queryClient = useQueryClient();

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const { data, isLoading, isError } = useQuery<Product[]>({
    queryKey: ["products", { search }],
    queryFn: async () => {
      const res = await api.get("/products", { params: { search } });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; price: number; description: string }) => {
      const res = await api.post("/products", payload);
      return res.data as Product;
    },
    onSuccess: async (saved) => {
      await uploadImageIfNeeded(saved.id);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      closeModal();
      toast.success("Product created");
    },
    onError: () => {
      toast.error("Failed to create product");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: number; name: string; price: number; description: string }) => {
      const { id, ...body } = payload;
      const res = await api.put(`/products/${id}`, body);
      return res.data as Product;
    },
    onSuccess: async (saved) => {
      await uploadImageIfNeeded(saved.id);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      closeModal();
      toast.success("Product updated");
    },
    onError: () => {
      toast.error("Failed to update product");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleteTarget(null);
      toast.success("Product deleted");
    },
    onError: () => {
      toast.error("Failed to delete product");
    },
  });

  function confirmDelete(product: Product) {
    setDeleteTarget(product);
  }

  function openCreateModal() {
    setEditingProduct(null);
    setForm({ name: "", price: "", description: "" });
    setImageFile(null);
    setIsModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      price: product.price.toString(),
      description: product.description ?? "",
    });
    setImageFile(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setImageFile(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceNumber = parseFloat(form.price || "0");
    if (!form.name || isNaN(priceNumber) || priceNumber <= 0) {
      return;
    }
    const payload = {
      name: form.name,
      price: priceNumber,
      description: form.description,
    };
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  async function uploadImageIfNeeded(productId: number) {
    if (!imageFile) return;
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      await api.post(`/products/${productId}/image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (e) {
      toast.error("Failed to upload product image");
    }
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Products</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Catalogue of SKUs available to your field team.
            </p>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name"
              className="flex-1 sm:w-64 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={openCreateModal}
              className="whitespace-nowrap rounded-md bg-indigo-600 px-3 py-1.5 text-xs sm:text-sm font-medium text-white shadow hover:bg-indigo-500"
            >
              Add Product
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60">
          {isLoading && (
            <div className="px-4 py-6 text-sm text-slate-400">Loading products...</div>
          )}
          {isError && (
            <div className="px-4 py-6 text-sm text-red-400">
              Failed to load products. Ensure /products API is implemented.
            </div>
          )}
          {data && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="bg-slate-900/80 text-left text-[11px] font-medium text-slate-400">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Image</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-900/70">
                      <td className="px-3 py-2 whitespace-nowrap text-slate-400">{product.id}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`${
                              process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1"
                            }${product.imageUrl}`}
                            alt={product.name}
                            className="h-9 w-9 rounded object-cover border border-slate-700 bg-slate-800"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-500">No image</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{product.name}</td>
                      <td className="px-3 py-2 whitespace-nowrap">₹ {product.price.toLocaleString()}</td>
                      <td className="px-3 py-2 max-w-xs truncate text-slate-300">
                        {product.description || "-"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-[11px] space-x-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-600 bg-slate-900/80 text-slate-200 hover:bg-slate-800"
                          title="Edit product"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => confirmDelete(product)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-600 bg-red-950/40 text-red-400 hover:bg-red-900/70"
                          title="Delete product"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-white">
              {editingProduct ? "Edit Product" : "Add Product"}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Fill in product details. ID will be created automatically in backend.
            </p>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs sm:text-sm">
              <div className="space-y-1">
                <label className="block text-slate-300">Product name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. FieldForcePro Premium"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-300">Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 4999"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-300">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Short internal description"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-300">Product image (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    setImageFile(file ?? null);
                  }}
                  className="w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-100 hover:file:bg-slate-700"
                />
                {editingProduct?.imageUrl && !imageFile && (
                  <div className="mt-2 flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${
                        process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1"
                      }${editingProduct.imageUrl}`}
                      alt={editingProduct.name}
                      className="h-10 w-10 rounded object-cover border border-slate-700 bg-slate-800"
                    />
                    <span className="text-[11px] text-slate-400">Existing image</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2 text-xs">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-slate-600 px-3 py-1.5 text-slate-200 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingProduct ? "Save changes" : "Create product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-white">Delete product</h2>
            <p className="mt-2 text-xs text-slate-300">
              Are you sure you want to delete
              <span className="font-semibold"> {deleteTarget.name}</span>? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-slate-200 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-500 disabled:opacity-60"
                disabled={deleteMutation.isPending}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
