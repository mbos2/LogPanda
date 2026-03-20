"use client";

import type { JSX, ReactNode } from "react";
import { AuthProvider } from "@lib/auth/auth-context";
import { ChakraProvider, defaultSystem  } from '@chakra-ui/react';
import { ThemeProvider } from 'next-themes';

export default function Providers({
  children,
}: {
  children: ReactNode;
  }): JSX.Element {
  
  return <ChakraProvider value={defaultSystem }>
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>;

    </ThemeProvider>
  </ChakraProvider>
}