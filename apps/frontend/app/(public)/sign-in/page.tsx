"use client";

import { useState, type ChangeEvent, type JSX } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Grid,
  GridItem,
  Icon,
  Button,
  Field,
  Fieldset,
  Input,
  Link,
  Text,
} from "@chakra-ui/react";
import { IoIosArrowDroprightCircle } from "react-icons/io";
import { SiFoodpanda } from "react-icons/si";
import { type ApiErrorResponse, type SignInPayload } from "@lib/auth/types";
import { useAuth } from "@lib/auth/auth-context";
import { signIn } from "@lib/auth/auth-service";

interface SignInFormState {
  email: string;
  password: string;
}

const getErrorMessage = (error: unknown): string => {
  const apiError: ApiErrorResponse | undefined = (
    error as {
      response?: { data?: ApiErrorResponse };
    }
  )?.response?.data;

  return apiError?.error?.message ?? "Failed to sign in.";
};

export default function SignInPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshAuth } = useAuth();

  const [form, setForm] = useState<SignInFormState>({
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleChange =
    (field: keyof SignInFormState) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      setForm((prev: SignInFormState): SignInFormState => {
        return {
          ...prev,
          [field]: event.target.value,
        };
      });

      if (errorMessage) {
        setErrorMessage("");
      }
    };

  const handleSubmit = async (): Promise<void> => {
    const payload: SignInPayload = {
      email: form.email.trim(),
      password: form.password,
    };

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      await signIn(payload);
      await refreshAuth();

      const next: string | null = searchParams.get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      w={{ base: "100%", md: "450px" }}
      maxW="100%"
      boxShadow={{ base: "none", md: "0px 6px 19px -8px" }}
      boxShadowColor="gray.100"
      borderRadius={8}
      px={{ base: 0, md: 4 }}
      py={12}
    >
      <Box width="100%" px={8}>
        <Grid templateRows="auto auto auto auto" gap="16px">
          <GridItem display="grid" py={4} justifyContent="center">
            <Box fontSize="2xl" fontWeight="bold" color="#4b6f44">
              <Icon size="xl" color="#4b6f44">
                <SiFoodpanda />
              </Icon>{" "}
              Log Panda
            </Box>
          </GridItem>

          <GridItem display="grid" gap={2}>
            <Box fontSize="xl" fontWeight="bold" textAlign="center">
              Welcome Back
            </Box>
            <Box color="gray.500" textAlign="center">
              Enter your credentials to access your account
            </Box>
          </GridItem>

          <GridItem>
            <Fieldset.Root>
              <Fieldset.Content>
                <Field.Root>
                  <Field.Label>Email Address</Field.Label>
                  <Input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange("email")}
                  />
                </Field.Root>

                <Field.Root>
                  <Box display="flex" w="full" justifyContent="space-between">
                    <Box>
                      <Field.Label>Password</Field.Label>
                    </Box>
                    <Link
                      fontSize="sm"
                      href="/forgot-password"
                      color="#4b6f44"
                      fontWeight="bold"
                    >
                      Forgot password?
                    </Link>
                  </Box>
                  <Input
                    name="password"
                    type="password"
                    placeholder="🔑 ••••••••••"
                    value={form.password}
                    onChange={handleChange("password")}
                  />
                </Field.Root>
              </Fieldset.Content>
            </Fieldset.Root>
          </GridItem>

          {errorMessage ? (
            <GridItem>
              <Text color="red.500" textAlign="center">
                {errorMessage}
              </Text>
            </GridItem>
          ) : null}

          <GridItem mt={4}>
            <Button
              w="full"
              type="button"
              alignSelf="flex-start"
              size="xl"
              bg="#4b6f44"
              color="white"
              onClick={(): void => {
                void handleSubmit();
              }}
              disabled={
                isSubmitting ||
                form.email.trim().length === 0 ||
                form.password.trim().length === 0
              }
              loading={isSubmitting}
            >
              Sign In{" "}
              <Icon size="lg">
                <IoIosArrowDroprightCircle />
              </Icon>
            </Button>
          </GridItem>

          <GridItem
            display={{ sm: "block", md: "flex" }}
            gap={2}
            justifyContent="center"
          >
            <Box>Don&apos;t have an account yet?</Box>
            <Link fontWeight="bold" color="#4b6f44" href="/sign-up">
              Create an account
            </Link>
          </GridItem>
        </Grid>
      </Box>
    </Box>
  );
}
