"use client";

import { useEffect, useState, type JSX } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Button,
  Grid,
  GridItem,
  Icon,
  Link,
  Text,
} from "@chakra-ui/react";
import { FaRegArrowAltCircleLeft } from "react-icons/fa";
import { SiFoodpanda } from "react-icons/si";
import { confirmSignUp } from "@lib/auth/auth-service";
import { ApiErrorResponse } from "@lib/auth/types";

type Status = "loading" | "success" | "error";

const getErrorMessage = (error: unknown): string => {
  const apiError: ApiErrorResponse | undefined = (
    error as {
      response?: { data?: ApiErrorResponse };
    }
  )?.response?.data;

  return apiError?.error?.message ?? "Failed to verify account.";
};

export default function ConfirmSignUpPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("Verifying your account...");

  useEffect((): void => {
    const run = async (): Promise<void> => {
      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link.");
        return;
      }

      try {
        await confirmSignUp({ token });
        setStatus("success");
        setMessage("Your account has been successfully verified.");
      } catch (error: unknown) {
        setStatus("error");
        setMessage(getErrorMessage(error));
      }
    };

    void run();
  }, [token]);

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
      <Box width="100%" px={{ base: 0, md: 4 }}>
        <Grid templateRows="auto auto auto" gap="16px">
          <GridItem display="grid" py={4} justifyContent="center">
            <Box fontSize="2xl" fontWeight="bold" color="#4b6f44">
              <Icon size="xl" color="#4b6f44">
                <SiFoodpanda />
              </Icon>
            </Box>
          </GridItem>

          <GridItem display="grid" gap={2}>
            <Box textAlign="center" fontSize="xl">
              Account verification
            </Box>
            <Text
              textAlign="center"
              color={status === "error" ? "red.500" : "gray.600"}
            >
              {message}
            </Text>
          </GridItem>

          <GridItem textAlign="center" mt={6}>
            {status === "success" ? (
              <Button
                bg="#4b6f44"
                color="white"
                onClick={(): void => {
                  router.replace("/sign-in");
                }}
              >
                Go to Sign In
              </Button>
            ) : null}

            {status === "error" ? (
              <Link color="#4b6f44" href="/sign-in">
                <Icon size="lg">
                  <FaRegArrowAltCircleLeft />
                </Icon>{" "}
                Back to Login
              </Link>
            ) : null}
          </GridItem>
        </Grid>
      </Box>
    </Box>
  );
}
