import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import ThemeProvider from "../_components/ThemeProvider";
import Sidebar from "../_components/Sidebar";
import Topbar from "../_components/Topbar";
import ResizableLayout from "../_components/ResizableLayout";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: {
    default: "How Things Work",
    template: "%s | How Things Work",
  },
  description:
    "Visual, interactive explanations of how technologies work under the hood.",
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider>
        <ResizableLayout sidebar={<Sidebar />}>
          <Topbar />
          <main className="flex-1 p-6">{children}</main>
        </ResizableLayout>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
