"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import PersonRemoveRounded from "@mui/icons-material/PersonRemoveRounded";
import FormTextField from "@/components/form/FormTextField";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { addMember, changeMemberRole, listMembers, removeMember } from "@/lib/boards/api";
import { boardsApiErrorKey, type BoardsApiErrorKey } from "@/lib/boards/errors";
import { addMemberSchema, type AddMemberValues } from "@/lib/boards/schemas";
import type { BoardMember, BoardRole } from "@/lib/boards/types";
import { initials } from "@/lib/users/initials";

type GrantableRole = Exclude<BoardRole, "OWNER">;
const GRANTABLE_ROLES: GrantableRole[] = ["EDITOR", "VIEWER"];

type BoardMembersDialogProps = {
  boardId: string;
  /** The signed-in user's role and id: the OWNER manages members, others can leave. */
  role: BoardRole;
  currentUserId: string;
  open: boolean;
  onClose: () => void;
};

/**
 * Members of the board. Loads the list when mounted — mount it per opening (key). The OWNER adds
 * members by email, changes roles and removes members; everyone else sees the list and can leave.
 */
export default function BoardMembersDialog({
  boardId,
  role,
  currentUserId,
  open,
  onClose,
}: BoardMembersDialogProps) {
  const t = useTranslations("BoardMembers");
  const tRole = useTranslations("BoardRole");
  const tErrors = useTranslations("BoardsApiErrors");
  const router = useRouter();
  const isOwner = role === "OWNER";

  const [members, setMembers] = useState<BoardMember[] | null>(null);
  const [error, setError] = useState<BoardsApiErrorKey | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [removal, setRemoval] = useState<{ member: BoardMember; open: boolean } | null>(null);
  const [removalError, setRemovalError] = useState<BoardsApiErrorKey | null>(null);

  // Initial load; state is only set from the request's callbacks, and not after unmount.
  useEffect(() => {
    let active = true;
    listMembers(boardId).then(
      (list) => active && setMembers(list),
      (loadError) => active && setError(boardsApiErrorKey(loadError)),
    );
    return () => {
      active = false;
    };
  }, [boardId]);

  /** Re-reads the list after a change made in this dialog. */
  const reload = async () => {
    try {
      setMembers(await listMembers(boardId));
    } catch (loadError) {
      setError(boardsApiErrorKey(loadError));
    }
  };

  const {
    control,
    handleSubmit,
    setError: setFormError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: "", role: "EDITOR" },
    mode: "onSubmit",
  });

  const onAdd = async (values: AddMemberValues) => {
    try {
      await addMember(boardId, values);
      reset({ email: "", role: values.role });
      await reload();
      router.refresh();
    } catch (addError) {
      setFormError("root.serverError", { message: boardsApiErrorKey(addError) });
    }
  };

  const onRoleChange = async (member: BoardMember, newRole: GrantableRole) => {
    setPendingUserId(member.userId);
    setError(null);
    try {
      await changeMemberRole(boardId, member.userId, newRole);
      await reload();
    } catch (changeError) {
      setError(boardsApiErrorKey(changeError));
    } finally {
      setPendingUserId(null);
    }
  };

  const confirmRemoval = async () => {
    if (!removal) return;
    const leaving = removal.member.userId === currentUserId;
    try {
      await removeMember(boardId, removal.member.userId);
      setRemoval({ ...removal, open: false });
      if (leaving) {
        router.push("/boards");
        return;
      }
      await reload();
      router.refresh();
    } catch (removeError) {
      setRemovalError(boardsApiErrorKey(removeError));
    }
  };

  const askRemoval = (member: BoardMember) => {
    setRemovalError(null);
    setRemoval({ member, open: true });
  };

  const addError = errors.root?.serverError?.message as BoardsApiErrorKey | undefined;
  const me = members?.find((member) => member.userId === currentUserId);
  const removingSelf = removal?.member.userId === currentUserId;

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogContent>
          {isOwner && (
            <Box component="form" noValidate onSubmit={handleSubmit(onAdd)} sx={{ pt: 1, mb: 2 }}>
              {addError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {tErrors(addError)}
                </Alert>
              )}
              <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1, alignItems: "flex-start" }}>
                <FormTextField
                  control={control}
                  name="email"
                  type="email"
                  label={t("email")}
                  autoComplete="off"
                  size="small"
                  sx={{ flex: 1 }}
                  fullWidth
                />
                <FormTextField
                  control={control}
                  name="role"
                  select
                  label={t("role")}
                  size="small"
                  sx={{ minWidth: 140 }}
                >
                  {GRANTABLE_ROLES.map((grantable) => (
                    <MenuItem key={grantable} value={grantable}>
                      {tRole(grantable)}
                    </MenuItem>
                  ))}
                </FormTextField>
                <Button type="submit" variant="contained" disableElevation loading={isSubmitting}>
                  {t("add")}
                </Button>
              </Stack>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {tErrors(error)}
            </Alert>
          )}

          {members === null && !error ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <List disablePadding>
              {members?.map((member) => {
                const isSelf = member.userId === currentUserId;
                const manageable = isOwner && member.role !== "OWNER";
                return (
                  <ListItem
                    key={member.userId}
                    disableGutters
                    secondaryAction={
                      manageable && (
                        <Stack direction="row" sx={{ gap: 0.5, alignItems: "center" }}>
                          <Select
                            size="small"
                            value={member.role}
                            disabled={pendingUserId === member.userId}
                            onChange={(event) =>
                              onRoleChange(member, event.target.value as GrantableRole)
                            }
                            inputProps={{ "aria-label": t("role") }}
                          >
                            {GRANTABLE_ROLES.map((grantable) => (
                              <MenuItem key={grantable} value={grantable}>
                                {tRole(grantable)}
                              </MenuItem>
                            ))}
                          </Select>
                          <IconButton
                            aria-label={t("remove", { name: member.name || member.email })}
                            onClick={() => askRemoval(member)}
                          >
                            <PersonRemoveRounded fontSize="small" />
                          </IconButton>
                        </Stack>
                      )
                    }
                    sx={{ pr: manageable ? 25 : 0 }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={member.image ?? undefined}
                        alt={member.name || member.email}
                        slotProps={{ img: { referrerPolicy: "no-referrer" } }}
                        sx={{ bgcolor: "primary.main" }}
                      >
                        {initials(member)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={isSelf ? `${member.name} (${t("you")})` : member.name}
                      secondary={member.email}
                      slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }}
                    />
                    {!manageable && (
                      <Chip size="small" label={tRole(member.role)} sx={{ ml: 1, flexShrink: 0 }} />
                    )}
                  </ListItem>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {!isOwner && me && (
            <Button color="error" onClick={() => askRemoval(me)} sx={{ mr: "auto" }}>
              {t("leave")}
            </Button>
          )}
          <Button onClick={onClose}>{t("close")}</Button>
        </DialogActions>
      </Dialog>

      {removal && (
        <ConfirmDialog
          open={removal.open}
          onClose={() => setRemoval({ ...removal, open: false })}
          title={t(removingSelf ? "leaveTitle" : "removeTitle")}
          text={
            removingSelf
              ? t("leaveText")
              : t("removeText", { name: removal.member.name || removal.member.email })
          }
          confirmLabel={t(removingSelf ? "confirmLeave" : "confirmRemove")}
          cancelLabel={t("cancel")}
          onConfirm={confirmRemoval}
          error={removalError ? tErrors(removalError) : undefined}
        />
      )}
    </>
  );
}
