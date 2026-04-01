"use client";

import type { JSX } from "react";
import { Box, Grid, GridItem, Icon, Link, Text } from "@chakra-ui/react";
import { FaRegArrowAltCircleLeft } from "react-icons/fa";
import { SiFoodpanda } from "react-icons/si";

export default function CheckEmailPage(): JSX.Element {
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
              Check your email
            </Box>
            <Text color="gray.500" textAlign="center">
              We sent you a verification email. Open the link in that email to
              verify your account.
            </Text>
          </GridItem>

          <GridItem textAlign="center" mt={8}>
            <Link color="#4b6f44" href="/sign-in">
              <Icon size="lg">
                <FaRegArrowAltCircleLeft />
              </Icon>{" "}
              Back to Login
            </Link>
          </GridItem>
        </Grid>
      </Box>
    </Box>
  );
}
