"use client";

import { useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import CloseRounded from "@mui/icons-material/CloseRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import ViewKanbanRounded from "@mui/icons-material/ViewKanbanRounded";
import ColorSchemeToggle from "./ColorSchemeToggle";
import LocaleSwitcher from "./LocaleSwitcher";
import { AUTH_ITEMS, isActive, NAV_ITEMS, type NavItem } from "./nav";

export default function AppHeader() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = () => setDrawerOpen(false);

  const renderDrawerItems = (items: readonly NavItem[]) =>
    items.map(({ key, href }) => {
      const active = isActive(pathname, href);
      return (
        <ListItem key={key} disablePadding>
          <ListItemButton
            component={NextLink}
            href={href}
            selected={active}
            aria-current={active ? "page" : undefined}
            onClick={closeDrawer}
          >
            <ListItemText primary={t(key)} />
          </ListItemButton>
        </ListItem>
      );
    });

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ gap: 1 }}>
          <Box
            component={NextLink}
            href="/"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mr: { md: 3 },
              color: "text.primary",
              textDecoration: "none",
            }}
          >
            <ViewKanbanRounded color="primary" />
            <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
              {t("brand")}
            </Typography>
          </Box>

          <Box
            component="nav"
            aria-label={t("mainNavigation")}
            sx={{ display: { xs: "none", md: "flex" }, gap: 0.5 }}
          >
            {NAV_ITEMS.map(({ key, href }) => {
              const active = isActive(pathname, href);
              return (
                <Button
                  key={key}
                  component={NextLink}
                  href={href}
                  color={active ? "primary" : "inherit"}
                  aria-current={active ? "page" : undefined}
                  sx={{ fontWeight: active ? 700 : 500 }}
                >
                  {t(key)}
                </Button>
              );
            })}
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <LocaleSwitcher />
          <ColorSchemeToggle />

          <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1, ml: 1 }}>
            <Button component={NextLink} href="/auth/sign-in" color="inherit">
              {t("signIn")}
            </Button>
            <Button component={NextLink} href="/auth/sign-up" variant="contained" disableElevation>
              {t("signUp")}
            </Button>
          </Box>

          <IconButton
            color="inherit"
            edge="end"
            aria-label={t("openMenu")}
            aria-controls="mobile-navigation"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            sx={{ display: { md: "none" } }}
          >
            <MenuRounded />
          </IconButton>
        </Toolbar>
      </Container>

      <Drawer
        id="mobile-navigation"
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        sx={{ display: { md: "none" } }}
      >
        <Box sx={{ width: 280 }}>
          <Toolbar sx={{ justifyContent: "space-between" }}>
            <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
              {t("brand")}
            </Typography>
            <IconButton edge="end" aria-label={t("closeMenu")} onClick={closeDrawer}>
              <CloseRounded />
            </IconButton>
          </Toolbar>
          <Divider />
          <Box component="nav" aria-label={t("mainNavigation")}>
            <List>{renderDrawerItems(NAV_ITEMS)}</List>
          </Box>
          <Divider />
          <List>{renderDrawerItems(AUTH_ITEMS)}</List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
