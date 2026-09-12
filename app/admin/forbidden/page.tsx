import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"

export default function ForbiddenPage() {
  return (
    <Frame spacing="default">
      <FrameHeader>
        <FrameTitle>Not authorized</FrameTitle>
        <FrameDescription>
          Your account needs realm-management or master admin roles to use this
          page.
        </FrameDescription>
      </FrameHeader>
      <FramePanel>
        <p className="text-muted-foreground text-sm">
          Ask an operator to assign those roles in the Keycloak master console.
        </p>
      </FramePanel>
    </Frame>
  )
}
