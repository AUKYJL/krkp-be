export type RequestWithCurrentUser = Request & {
  currentUser: {
    id: string;
  };
  role: string;
};
