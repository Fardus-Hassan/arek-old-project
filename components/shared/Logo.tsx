import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image
        src="/images/icon-purple-circle.svg"
        alt="Logo"
        width={38}
        height={38}
      />
      <span className="text-primary font-bold text-2xl tracking-tight">
        Resale AI
      </span>
    </Link>
  );
}
