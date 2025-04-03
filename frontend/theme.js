import { createTheme } from "@mui/material/styles";

const theme = createTheme({
	palette: {
		mode: "dark",
		background: {
			default: "#0b0f19",
			paper: "#141a2a",
		},
		primary: {
			main: "#00C2A8",
		},
		secondary: {
			main: "#1F8EF1",
		},
		text: {
			primary: "#ffffff",
			secondary: "#a5b1cd",
		},
		divider: "#2a3045",
	},
	typography: {
		fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
		button: {
			textTransform: "none",
			fontWeight: 600,
		},
	},
	components: {
		MuiButton: {
			styleOverrides: {
				root: {
					borderRadius: 12,
				},
			},
		},
		MuiTextField: {
			styleOverrides: {
				root: {
					input: {
						color: "white",
					},
				},
			},
		},
		MuiPaper: {
			styleOverrides: {
				root: {
					backgroundImage: "none",
				},
			},
		},
	},
});

export default theme;
