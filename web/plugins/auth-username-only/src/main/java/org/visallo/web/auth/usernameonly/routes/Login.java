package org.visallo.web.auth.usernameonly.routes;

import com.google.inject.Inject;
import com.v5analytics.webster.ParameterizedHandler;
import com.v5analytics.webster.annotations.Handle;
import com.v5analytics.webster.utils.UrlUtils;
import org.json.JSONObject;
import org.visallo.core.model.user.UserRepository;
import org.visallo.core.user.User;
import org.visallo.web.AuthenticationHandler;
import org.visallo.web.CurrentUser;

import javax.servlet.http.HttpServletRequest;

public class Login implements ParameterizedHandler {
    private final UserRepository userRepository;

    @Inject
    public Login(
            UserRepository userRepository
    ) {
        this.userRepository = userRepository;
    }

    @Handle
    public JSONObject handle(
            HttpServletRequest request
    ) throws Exception {
        final String username = UrlUtils.urlDecode(request.getParameter("username")).trim().toLowerCase();

        User user = userRepository.findByUsername(username);
        if (user == null) {
            // For form based authentication, username and displayName will be the same
            String randomPassword = UserRepository.createRandomPassword();
            user = userRepository.findOrAddUser(username, username, null, randomPassword, new String[0]);
        }

        userRepository.recordLogin(user, AuthenticationHandler.getRemoteAddr(request));

        CurrentUser.set(request, user.getUserId(), user.getUsername());
        JSONObject json = new JSONObject();
        json.put("status", "OK");
        return json;
    }
}
