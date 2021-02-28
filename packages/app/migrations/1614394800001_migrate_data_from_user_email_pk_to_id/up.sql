UPDATE public.user_preference p
  SET user_id = u.id
  FROM public.user u
  WHERE p.email = u.email;
