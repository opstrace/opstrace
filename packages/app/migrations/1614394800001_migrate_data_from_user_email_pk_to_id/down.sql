UPDATE public.user_preference p
  SET email = u.email
  FROM public.user u
  WHERE p.user_id = u.id;
