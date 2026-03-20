import { Container, AbsoluteCenter, Box } from "@chakra-ui/react";
import PublicOnlyRoute from "@components/public-route";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicOnlyRoute>
      <Container height={"100%"} w={"full"}>
        <Box
          position="relative"
          h="100vh"
          borderRadius="md"
          w={"full"}
          display={"grid"}
          justifyContent={"center"}
        >
          <AbsoluteCenter w={{ base: "90%", sm: "70%", md: "auto" }}>
            <Box borderRadius="md" w={"full"}>
              {children}
            </Box>
          </AbsoluteCenter>
        </Box>
      </Container>
    </PublicOnlyRoute>
  );
}
