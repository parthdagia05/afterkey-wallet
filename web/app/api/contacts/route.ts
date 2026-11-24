import { deleteContact, getContacts, saveContact } from "@/lib/store";
import { isQorAddress } from "@/lib/wallet";

export async function GET() {
  return Response.json({ contacts: await getContacts() });
}

export async function POST(request: Request) {
  const { name, address } = await request.json();
  if (!name || typeof name !== "string" || name.length > 32) {
    return Response.json({ error: "Name required (max 32 chars)" }, { status: 400 });
  }
  if (!isQorAddress(address ?? "")) {
    return Response.json({ error: "Invalid qor1 address" }, { status: 400 });
  }
  return Response.json({ contacts: await saveContact(name.trim(), address) });
}

export async function DELETE(request: Request) {
  const { name } = await request.json();
  return Response.json({ contacts: await deleteContact(String(name ?? "")) });
}
